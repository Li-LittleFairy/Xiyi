-- Draft baseline for the phase-1 store workflow. Not executed.
-- Target: MySQL 8.0.16+ with enforced CHECK constraints; InnoDB, utf8mb4.
-- Select a NEW dedicated project schema explicitly before applying.
-- No CREATE DATABASE, USE, DROP, seed passwords or global configuration changes.
-- MySQL DDL implicitly commits: the seven CREATE statements are not one transaction.
-- All DATETIME values are UTC supplied by the application. Money is integer CNY cents.

CREATE TABLE staff_account (
    id BIGINT NOT NULL AUTO_INCREMENT,
    username VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    password_hash VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    role_code VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    enabled TINYINT NOT NULL DEFAULT 1,
    version BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_staff_username (username),
    CONSTRAINT ck_staff_role CHECK (role_code IN ('MANAGER', 'STAFF')),
    CONSTRAINT ck_staff_enabled CHECK (enabled IN (0, 1)),
    CONSTRAINT ck_staff_version CHECK (version >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE customer (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    phone VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    remark VARCHAR(500) NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_customer_phone (phone),
    KEY idx_customer_name (name),
    CONSTRAINT ck_customer_version CHECK (version >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE service_item (
    id BIGINT NOT NULL AUTO_INCREMENT,
    code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    name VARCHAR(100) NOT NULL,
    standard_price_cents BIGINT NOT NULL,
    enabled TINYINT NOT NULL DEFAULT 1,
    version BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_service_code (code),
    CONSTRAINT ck_service_price CHECK (standard_price_cents > 0),
    CONSTRAINT ck_service_enabled CHECK (enabled IN (0, 1)),
    CONSTRAINT ck_service_version CHECK (version >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE laundry_order (
    id BIGINT NOT NULL AUTO_INCREMENT,
    order_no VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    customer_id BIGINT NOT NULL,
    contact_name VARCHAR(50) NOT NULL,
    contact_phone VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    status VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    total_amount_cents BIGINT NOT NULL,
    expected_pickup_date DATE NOT NULL,
    note VARCHAR(1000) NULL,
    received_by BIGINT NOT NULL,
    received_at DATETIME(3) NOT NULL,
    washing_started_at DATETIME(3) NULL,
    ready_at DATETIME(3) NULL,
    delivered_by BIGINT NULL,
    delivered_at DATETIME(3) NULL,
    cancelled_by BIGINT NULL,
    cancelled_at DATETIME(3) NULL,
    cancel_reason VARCHAR(500) NULL,
    create_request_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    create_request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_no (order_no),
    UNIQUE KEY uk_order_create_request (create_request_key),
    KEY idx_order_customer_date (customer_id, created_at),
    KEY idx_order_status_date (status, created_at),
    KEY idx_order_contact_phone (contact_phone),
    KEY idx_order_created_at (created_at),
    CONSTRAINT fk_order_customer FOREIGN KEY (customer_id) REFERENCES customer (id),
    CONSTRAINT fk_order_received_by FOREIGN KEY (received_by) REFERENCES staff_account (id),
    CONSTRAINT fk_order_delivered_by FOREIGN KEY (delivered_by) REFERENCES staff_account (id),
    CONSTRAINT fk_order_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES staff_account (id),
    CONSTRAINT ck_order_status CHECK (status IN ('RECEIVED', 'WASHING', 'READY', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT ck_order_amount CHECK (total_amount_cents > 0),
    CONSTRAINT ck_order_version CHECK (version >= 0),
    CONSTRAINT ck_order_delivery_time CHECK (
        (status = 'COMPLETED' AND delivered_at IS NOT NULL) OR
        (status <> 'COMPLETED' AND delivered_at IS NULL)
    ),
    CONSTRAINT ck_order_cancellation CHECK (
        (status = 'CANCELLED' AND cancelled_at IS NOT NULL AND
         cancel_reason IS NOT NULL AND CHAR_LENGTH(TRIM(cancel_reason)) > 0) OR
        (status <> 'CANCELLED' AND cancelled_at IS NULL AND cancel_reason IS NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_item (
    id BIGINT NOT NULL AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    item_no INT NOT NULL,
    garment_type VARCHAR(50) NOT NULL,
    color VARCHAR(50) NOT NULL,
    condition_note VARCHAR(500) NOT NULL,
    service_item_id BIGINT NOT NULL,
    service_name_snapshot VARCHAR(100) NOT NULL,
    unit_price_cents BIGINT NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_item_order_number (order_id, item_no),
    CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES laundry_order (id),
    CONSTRAINT fk_item_service FOREIGN KEY (service_item_id) REFERENCES service_item (id),
    CONSTRAINT ck_item_number CHECK (item_no > 0),
    CONSTRAINT ck_item_price CHECK (unit_price_cents > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_record (
    id BIGINT NOT NULL AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    amount_cents BIGINT NOT NULL,
    method VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    paid_at DATETIME(3) NOT NULL,
    received_by BIGINT NOT NULL,
    request_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_payment_order (order_id),
    UNIQUE KEY uk_payment_request (request_key),
    KEY idx_payment_paid_at (paid_at),
    CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES laundry_order (id),
    CONSTRAINT fk_payment_received_by FOREIGN KEY (received_by) REFERENCES staff_account (id),
    CONSTRAINT ck_payment_amount CHECK (amount_cents > 0),
    CONSTRAINT ck_payment_method CHECK (method IN ('CASH', 'OFFLINE_ELECTRONIC'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_event (
    id BIGINT NOT NULL AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    actor_id BIGINT NOT NULL,
    actor_name_snapshot VARCHAR(50) NOT NULL,
    event_type VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    occurred_at DATETIME(3) NOT NULL,
    reason VARCHAR(1000) NULL,
    before_data JSON NULL,
    after_data JSON NULL,
    PRIMARY KEY (id),
    KEY idx_event_order_time (order_id, occurred_at, id),
    CONSTRAINT fk_event_order FOREIGN KEY (order_id) REFERENCES laundry_order (id),
    CONSTRAINT fk_event_actor FOREIGN KEY (actor_id) REFERENCES staff_account (id),
    CONSTRAINT ck_event_type CHECK (event_type IN (
        'RECEIVED', 'WASHING_STARTED', 'WASHING_FINISHED', 'PAYMENT_RECORDED',
        'DELIVERED', 'EDITED', 'CANCELLED', 'EXCEPTION_NOTED'
    ))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
