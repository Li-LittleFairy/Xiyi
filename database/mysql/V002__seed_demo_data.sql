-- V002: 一期演示数据（虚构）。目标：MySQL 8.0.16+，InnoDB，utf8mb4。
-- 前提：已执行 V001 建表；库为 xiyi_dev；七张表为空。
-- 金额单位为分（整数）；所有 DATETIME 为应用层提供的 UTC 值。
-- 本脚本幂等设计为「仅在空表时执行」，重复执行会先删除旧演示数据再重建，
--   以支持反复演示；业务正式数据接入后不应再运行本脚本。
-- 时间用固定 UTC 时点，便于复现（虚构日期，不代表真实营业日期）。

SET time_zone = '+00:00';
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE order_event;
TRUNCATE TABLE payment_record;
TRUNCATE TABLE order_item;
TRUNCATE TABLE laundry_order;
TRUNCATE TABLE service_item;
TRUNCATE TABLE customer;
TRUNCATE TABLE staff_account;
SET FOREIGN_KEY_CHECKS = 1;

START TRANSACTION;

-- 时间基点：UTC 2026-11-16 02:00:00.000（虚构）
SET @t0 = STR_TO_DATE('2026-11-16 02:00:00.000', '%Y-%m-%d %H:%i:%s.%f');

-- 1) 员工
INSERT INTO staff_account (username, password_hash, display_name, role_code, enabled, created_at, updated_at)
VALUES
  ('linxiao',   SHA2('demo-pass-linxiao', 256), '林晓', 'MANAGER', 1, @t0, @t0),
  ('xiaochen',  SHA2('demo-pass-xiaochen', 256), '小陈', 'STAFF',   1, @t0, @t0);
SET @staff_lin  = (SELECT id FROM staff_account WHERE username = 'linxiao');
SET @staff_chen = (SELECT id FROM staff_account WHERE username = 'xiaochen');

-- 2) 客户
INSERT INTO customer (name, phone, remark, created_at, updated_at)
VALUES
  ('张女士', '13912345678', '住在小区3栋，偏好上门取送', @t0, @t0),
  ('李先生', '13898765432', NULL, @t0, @t0);
SET @customer_zhang = (SELECT id FROM customer WHERE phone = '13912345678');
SET @customer_li    = (SELECT id FROM customer WHERE phone = '13898765432');

-- 3) 洗护项目
INSERT INTO service_item (code, name, standard_price_cents, enabled, created_at, updated_at)
VALUES
  ('COAT',   '外套清洗',   4000, 1, @t0, @t0),
  ('DOWN',   '羽绒服清洗', 6800, 1, @t0, @t0),
  ('SHIRT',  '衬衫清洗',   2000, 1, @t0, @t0),
  ('SWEATER','毛衣清洗',   2500, 1, @t0, @t0);
SET @svc_coat = (SELECT id FROM service_item WHERE code = 'COAT');
SET @svc_down = (SELECT id FROM service_item WHERE code = 'DOWN');
SET @svc_shirt = (SELECT id FROM service_item WHERE code = 'SHIRT');

-- 4) 订单 O-20261116-0001：张女士，3 件，已完成（走完一期全流程）
--    2*外套(4000) + 1*羽绒服(6800) = 14800 分
INSERT INTO laundry_order
  (order_no, customer_id, contact_name, contact_phone, status, total_amount_cents,
   expected_pickup_date, note, received_by, received_at,
   washing_started_at, ready_at, delivered_by, delivered_at,
   create_request_key, create_request_hash, created_at, updated_at)
VALUES
  ('O-20261116-0001', @customer_zhang, '张女士', '13912345678', 'COMPLETED', 14800,
   '2026-11-19', '加急，请尽快', @staff_chen, DATE_ADD(@t0, INTERVAL 1 HOUR),
   DATE_ADD(@t0, INTERVAL 2 HOUR), DATE_ADD(@t0, INTERVAL 26 HOUR),
   @staff_lin, DATE_ADD(@t0, INTERVAL 28 HOUR),
   'demo-create-0001', SHA2('demo-create-0001', 256),
   DATE_ADD(@t0, INTERVAL 1 HOUR), DATE_ADD(@t0, INTERVAL 28 HOUR));
SET @order1 = LAST_INSERT_ID();

INSERT INTO order_item
  (order_id, item_no, garment_type, color, condition_note, service_item_id, service_name_snapshot, unit_price_cents, created_at, updated_at)
VALUES
  (@order1, 1, '外套',   '米色', '袖口破损',     @svc_coat, '外套清洗',   4000, @t0, @t0),
  (@order1, 2, '外套',   '黑色', '无明显瑕疵',   @svc_coat, '外套清洗',   4000, @t0, @t0),
  (@order1, 3, '羽绒服', '白色', '领口污渍',     @svc_down, '羽绒服清洗', 6800, @t0, @t0);

INSERT INTO payment_record
  (order_id, amount_cents, method, paid_at, received_by, request_key, request_hash, created_at)
VALUES
  (@order1, 14800, 'CASH', DATE_ADD(@t0, INTERVAL 27 HOUR), @staff_lin,
   'demo-pay-0001', SHA2('demo-pay-0001', 256), DATE_ADD(@t0, INTERVAL 27 HOUR));

INSERT INTO order_event (order_id, actor_id, actor_name_snapshot, event_type, occurred_at, reason, before_data, after_data)
VALUES
  (@order1, @staff_chen, '小陈', 'RECEIVED',           DATE_ADD(@t0, INTERVAL 1 HOUR),  NULL, NULL, JSON_OBJECT('status','RECEIVED')),
  (@order1, @staff_chen, '小陈', 'WASHING_STARTED',    DATE_ADD(@t0, INTERVAL 2 HOUR),  NULL, NULL, JSON_OBJECT('status','WASHING')),
  (@order1, @staff_chen, '小陈', 'WASHING_FINISHED',   DATE_ADD(@t0, INTERVAL 26 HOUR), NULL, NULL, JSON_OBJECT('status','READY')),
  (@order1, @staff_lin,  '林晓', 'PAYMENT_RECORDED',   DATE_ADD(@t0, INTERVAL 27 HOUR), NULL, NULL, JSON_OBJECT('amount_cents',14800,'method','CASH')),
  (@order1, @staff_lin,  '林晓', 'DELIVERED',          DATE_ADD(@t0, INTERVAL 28 HOUR), NULL, NULL, JSON_OBJECT('status','COMPLETED'));

-- 5) 订单 O-20261116-0002：李先生，2 件衬衫，待取衣（已洗好、未收款）
--    2*衬衫(2000) = 4000 分
INSERT INTO laundry_order
  (order_no, customer_id, contact_name, contact_phone, status, total_amount_cents,
   expected_pickup_date, note, received_by, received_at,
   washing_started_at, ready_at,
   create_request_key, create_request_hash, created_at, updated_at)
VALUES
  ('O-20261116-0002', @customer_li, '李先生', '13898765432', 'READY', 4000,
   '2026-11-20', NULL, @staff_chen, DATE_ADD(@t0, INTERVAL 20 HOUR),
   DATE_ADD(@t0, INTERVAL 21 HOUR), DATE_ADD(@t0, INTERVAL 30 HOUR),
   'demo-create-0002', SHA2('demo-create-0002', 256),
   DATE_ADD(@t0, INTERVAL 20 HOUR), DATE_ADD(@t0, INTERVAL 30 HOUR));
SET @order2 = LAST_INSERT_ID();

INSERT INTO order_item
  (order_id, item_no, garment_type, color, condition_note, service_item_id, service_name_snapshot, unit_price_cents, created_at, updated_at)
VALUES
  (@order2, 1, '衬衫', '白色', '无明显瑕疵', @svc_shirt, '衬衫清洗', 2000, @t0, @t0),
  (@order2, 2, '衬衫', '蓝色', '无明显瑕疵', @svc_shirt, '衬衫清洗', 2000, @t0, @t0);

INSERT INTO order_event (order_id, actor_id, actor_name_snapshot, event_type, occurred_at, reason, before_data, after_data)
VALUES
  (@order2, @staff_chen, '小陈', 'RECEIVED',         DATE_ADD(@t0, INTERVAL 20 HOUR), NULL, NULL, JSON_OBJECT('status','RECEIVED')),
  (@order2, @staff_chen, '小陈', 'WASHING_STARTED',  DATE_ADD(@t0, INTERVAL 21 HOUR), NULL, NULL, JSON_OBJECT('status','WASHING')),
  (@order2, @staff_chen, '小陈', 'WASHING_FINISHED', DATE_ADD(@t0, INTERVAL 30 HOUR), NULL, NULL, JSON_OBJECT('status','READY'));

-- 6) 订单 O-20261116-0003：张女士，1 件毛衣，洗护中（未收款）
INSERT INTO laundry_order
  (order_no, customer_id, contact_name, contact_phone, status, total_amount_cents,
   expected_pickup_date, note, received_by, received_at,
   washing_started_at,
   create_request_key, create_request_hash, created_at, updated_at)
VALUES
  ('O-20261116-0003', @customer_zhang, '张女士', '13912345678', 'WASHING', 2500,
   '2026-11-21', NULL, @staff_lin, DATE_ADD(@t0, INTERVAL 40 HOUR),
   DATE_ADD(@t0, INTERVAL 41 HOUR),
   'demo-create-0003', SHA2('demo-create-0003', 256),
   DATE_ADD(@t0, INTERVAL 40 HOUR), DATE_ADD(@t0, INTERVAL 41 HOUR));
SET @order3 = LAST_INSERT_ID();

INSERT INTO order_item
  (order_id, item_no, garment_type, color, condition_note, service_item_id, service_name_snapshot, unit_price_cents, created_at, updated_at)
VALUES
  (@order3, 1, '毛衣', '灰色', '无明显瑕疵', @svc_shirt, '毛衣清洗', 2500, @t0, @t0);

INSERT INTO order_event (order_id, actor_id, actor_name_snapshot, event_type, occurred_at, reason, before_data, after_data)
VALUES
  (@order3, @staff_lin, '林晓', 'RECEIVED',        DATE_ADD(@t0, INTERVAL 40 HOUR), NULL, NULL, JSON_OBJECT('status','RECEIVED')),
  (@order3, @staff_lin, '林晓', 'WASHING_STARTED', DATE_ADD(@t0, INTERVAL 41 HOUR), NULL, NULL, JSON_OBJECT('status','WASHING'));

COMMIT;
