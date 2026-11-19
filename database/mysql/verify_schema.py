"""Verify the new empty xiyi_dev schema. Uses mysql_config_editor login-path xiyi.

No passwords are read by this script. Fixture DML is always rolled back, either
explicitly on success or by closing the connection on an expected SQL error.
AUTO_INCREMENT counters may advance; this does not leave fixture rows behind.
Run only on the dedicated empty development schema after its initial migration.
"""
import re
import subprocess
import sys

ARGS = [
    'mysql', '--login-path=xiyi', '--connect-timeout=5',
    '--default-character-set=utf8mb4', '--database=xiyi_dev',
    '--batch', '--raw', '--skip-column-names',
]
TABLES = ['staff_account', 'customer', 'service_item', 'laundry_order',
          'order_item', 'payment_record', 'order_event']

def run(sql):
    return subprocess.run(ARGS, input=sql, text=True, encoding='utf-8',
                          errors='replace', capture_output=True, timeout=30)

def assert_empty():
    sql = ' UNION ALL '.join(f"SELECT '{t}', COUNT(*) FROM {t}" for t in TABLES) + ';'
    result = run(sql)
    if result.returncode:
        raise RuntimeError(result.stderr)
    rows = [line.split('\t') for line in result.stdout.strip().splitlines()]
    if len(rows) != 7 or any(row[1] != '0' for row in rows):
        raise RuntimeError('Expected seven empty tables; stop without changing existing data.')

SEED = """
SET time_zone = '+00:00';
START TRANSACTION;
SET @now = UTC_TIMESTAMP(3);
INSERT INTO staff_account (username,password_hash,display_name,role_code,created_at,updated_at)
VALUES ('schema_verify','TEST_ONLY_NOT_A_LOGIN_HASH','验证店长','MANAGER',@now,@now);
SET @staff=LAST_INSERT_ID();
INSERT INTO customer (name,phone,created_at,updated_at)
VALUES ('验证客户','13900000000',@now,@now);
SET @customer=LAST_INSERT_ID();
INSERT INTO service_item (code,name,standard_price_cents,created_at,updated_at)
VALUES ('VERIFY_COAT','外套清洗',4000,@now,@now);
SET @coat=LAST_INSERT_ID();
INSERT INTO service_item (code,name,standard_price_cents,created_at,updated_at)
VALUES ('VERIFY_DOWN','羽绒服清洗',6800,@now,@now);
SET @down=LAST_INSERT_ID();
INSERT INTO laundry_order
(order_no,customer_id,contact_name,contact_phone,status,total_amount_cents,
 expected_pickup_date,received_by,received_at,create_request_key,create_request_hash,created_at,updated_at)
VALUES ('VERIFY_ORDER',@customer,'验证客户','13900000000','RECEIVED',14800,
 DATE_ADD(UTC_DATE(),INTERVAL 3 DAY),@staff,@now,'verify-create',SHA2('verify-create',256),@now,@now);
SET @order=LAST_INSERT_ID();
INSERT INTO order_item
(order_id,item_no,garment_type,color,condition_note,service_item_id,service_name_snapshot,unit_price_cents,created_at,updated_at)
VALUES
(@order,1,'外套','米色','袖口破损',@coat,'外套清洗',4000,@now,@now),
(@order,2,'外套','黑色','无明显瑕疵',@coat,'外套清洗',4000,@now,@now),
(@order,3,'羽绒服','白色','领口污渍',@down,'羽绒服清洗',6800,@now,@now);
INSERT INTO order_event (order_id,actor_id,actor_name_snapshot,event_type,occurred_at)
VALUES (@order,@staff,'验证店长','RECEIVED',@now);
"""

PAY = """
INSERT INTO payment_record (order_id,amount_cents,method,paid_at,received_by,request_key,request_hash,created_at)
VALUES (@order,14800,'CASH',@now,@staff,'verify-pay',SHA2('verify-pay',256),@now);
"""

POSITIVE = """
SELECT 'items_and_amount', COUNT(*)=3 AND SUM(unit_price_cents)=14800 FROM order_item WHERE order_id=@order;
SELECT 'no_payment', COUNT(*)=0 FROM payment_record WHERE order_id=@order;
SELECT 'utf8_condition', COUNT(*)=1 FROM order_item WHERE order_id=@order AND condition_note='袖口破损';
UPDATE service_item SET standard_price_cents=7800,version=version+1 WHERE id=@down;
SELECT 'price_snapshot', (SELECT total_amount_cents FROM laundry_order WHERE id=@order)=14800
 AND (SELECT unit_price_cents FROM order_item WHERE order_id=@order AND item_no=3)=6800;
UPDATE laundry_order SET status='WASHING',washing_started_at=@now,version=version+1 WHERE id=@order;
INSERT INTO order_event (order_id,actor_id,actor_name_snapshot,event_type,occurred_at)
VALUES (@order,@staff,'验证店长','WASHING_STARTED',@now);
UPDATE laundry_order SET status='READY',ready_at=@now,version=version+1 WHERE id=@order;
INSERT INTO order_event (order_id,actor_id,actor_name_snapshot,event_type,occurred_at)
VALUES (@order,@staff,'验证店长','WASHING_FINISHED',@now);
""" + PAY + """
INSERT INTO order_event (order_id,actor_id,actor_name_snapshot,event_type,occurred_at)
VALUES (@order,@staff,'验证店长','PAYMENT_RECORDED',@now);
SELECT 'paid_once',COUNT(*)=1 AND SUM(amount_cents)=14800 FROM payment_record WHERE order_id=@order;
SELECT 'paid_still_ready',status='READY' FROM laundry_order WHERE id=@order;
UPDATE laundry_order SET status='COMPLETED',delivered_by=@staff,delivered_at=@now,version=version+1 WHERE id=@order;
INSERT INTO order_event (order_id,actor_id,actor_name_snapshot,event_type,occurred_at)
VALUES (@order,@staff,'验证店长','DELIVERED',@now);
SELECT 'completed',status='COMPLETED' AND delivered_by=@staff AND delivered_at IS NOT NULL FROM laundry_order WHERE id=@order;
SELECT 'five_events',COUNT(*)=5 FROM order_event WHERE order_id=@order;
ROLLBACK;
"""

NEGATIVE = [
    ('invalid_role', "UPDATE staff_account SET role_code='OWNER' WHERE id=@staff;", 3819, 'ck_staff_role'),
    ('negative_price', 'UPDATE service_item SET standard_price_cents=-1 WHERE id=@coat;', 3819, 'ck_service_price'),
    ('invalid_order_status', "UPDATE laundry_order SET status='UNKNOWN' WHERE id=@order;", 3819, 'ck_order_status'),
    ('delivery_without_time', "UPDATE laundry_order SET status='COMPLETED' WHERE id=@order;", 3819, 'ck_order_delivery_time'),
    ('cancel_without_reason', "UPDATE laundry_order SET status='CANCELLED',cancelled_at=@now WHERE id=@order;", 3819, 'ck_order_cancellation'),
    ('duplicate_order_number', """INSERT INTO laundry_order
     (order_no,customer_id,contact_name,contact_phone,status,total_amount_cents,expected_pickup_date,
      received_by,received_at,create_request_key,create_request_hash,created_at,updated_at)
     SELECT order_no,customer_id,contact_name,contact_phone,status,total_amount_cents,expected_pickup_date,
      received_by,received_at,'other-key',create_request_hash,created_at,updated_at
     FROM laundry_order WHERE id=@order;""", 1062, 'uk_order_no'),
    ('duplicate_garment_number', """INSERT INTO order_item
     (order_id,item_no,garment_type,color,condition_note,service_item_id,service_name_snapshot,unit_price_cents,created_at,updated_at)
     SELECT order_id,item_no,garment_type,color,condition_note,service_item_id,service_name_snapshot,unit_price_cents,created_at,updated_at
     FROM order_item WHERE order_id=@order AND item_no=1;""", 1062, 'uk_item_order_number'),
    ('second_payment', PAY + """INSERT INTO payment_record
     (order_id,amount_cents,method,paid_at,received_by,request_key,request_hash,created_at)
     VALUES (@order,14800,'CASH',@now,@staff,'second-pay',SHA2('second-pay',256),@now);""", 1062, 'uk_payment_order'),
    ('missing_customer', 'UPDATE laundry_order SET customer_id=-1 WHERE id=@order;', 1452, 'fk_order_customer'),
    ('referenced_customer_delete', 'DELETE FROM customer WHERE id=@customer;', 1451, 'fk_order_customer'),
]

def main():
    assert_empty()
    result = run(SEED + POSITIVE)
    if result.returncode:
        raise RuntimeError(result.stderr)
    checks = [line.split('\t') for line in result.stdout.strip().splitlines()]
    if len(checks) != 8 or any(row[1] != '1' for row in checks):
        raise AssertionError(result.stdout)
    print('PASS: normal workflow, UTF-8, historical prices, payment and event records (8 assertions).')
    for name,statement,code,constraint in NEGATIVE:
        result = run(SEED + statement + '\nROLLBACK;')
        if result.returncode == 0 or not re.search(rf'ERROR {code}\b',result.stderr) or constraint not in result.stderr:
            raise AssertionError(f'{name}: expected {code}/{constraint}; got {result.returncode}: {result.stderr}')
        print(f'PASS: {name} rejected by {constraint} (MySQL {code}).')
    assert_empty()
    print('PASS: all 7 tables remain empty. Fixture transactions rolled back.')
    print('NOT TESTED: backend authorization/state guards, concurrent requests, restart and backup/restore.')

if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'FAILED: {exc}',file=sys.stderr)
        sys.exit(1)
