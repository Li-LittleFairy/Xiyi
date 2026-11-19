package com.xiyi.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class OrderRepository {

    private static final String HEADER_SELECT = """
            SELECT o.id, o.order_no, o.customer_id, o.contact_name, o.contact_phone,
                   o.status, o.total_amount_cents, o.expected_pickup_date, o.note,
                   o.received_by, receiver.display_name AS received_by_name, o.received_at,
                   o.washing_started_at, o.ready_at,
                   o.delivered_by, deliverer.display_name AS delivered_by_name, o.delivered_at,
                   o.cancelled_by, canceller.display_name AS cancelled_by_name, o.cancelled_at,
                   o.cancel_reason, o.create_request_key, o.create_request_hash, o.version
            FROM laundry_order o
            JOIN staff_account receiver ON receiver.id = o.received_by
            LEFT JOIN staff_account deliverer ON deliverer.id = o.delivered_by
            LEFT JOIN staff_account canceller ON canceller.id = o.cancelled_by
            """;

    private final JdbcTemplate jdbcTemplate;

    public OrderRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<OrderSummary> search(String status, String keyword) {
        StringBuilder sql = new StringBuilder("""
                SELECT o.id, o.order_no, o.contact_name, o.contact_phone, o.status,
                       o.total_amount_cents, o.expected_pickup_date, o.received_at,
                       EXISTS(SELECT 1 FROM payment_record p WHERE p.order_id = o.id) AS paid
                FROM laundry_order o WHERE 1 = 1
                """);
        List<Object> parameters = new ArrayList<>();
        if (status != null && !status.isBlank()) {
            sql.append(" AND o.status = ? ");
            parameters.add(status);
        }
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND (o.order_no LIKE ? OR o.contact_name LIKE ? OR o.contact_phone LIKE ?) ");
            String like = "%" + keyword.trim() + "%";
            parameters.add(like);
            parameters.add(like);
            parameters.add(like);
        }
        sql.append(" ORDER BY o.created_at DESC, o.id DESC LIMIT 100 ");
        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> new OrderSummary(
                rs.getLong("id"),
                rs.getString("order_no"),
                rs.getString("contact_name"),
                rs.getString("contact_phone"),
                rs.getString("status"),
                rs.getLong("total_amount_cents"),
                rs.getObject("expected_pickup_date", LocalDate.class),
                rs.getObject("received_at", LocalDateTime.class),
                rs.getBoolean("paid")
        ), parameters.toArray());
    }

    public Optional<OrderHeader> findById(long id) {
        return queryHeader(HEADER_SELECT + " WHERE o.id = ?", id);
    }

    public Optional<OrderHeader> findByIdForUpdate(long id) {
        return queryHeader(HEADER_SELECT + " WHERE o.id = ? FOR UPDATE", id);
    }

    public Optional<OrderHeader> findByCreateRequestKey(String requestKey) {
        return queryHeader(HEADER_SELECT + " WHERE o.create_request_key = ?", requestKey);
    }

    public long insertOrder(
            String orderNo,
            long customerId,
            String contactName,
            String contactPhone,
            long totalAmountCents,
            LocalDate expectedPickupDate,
            String note,
            long receivedBy,
            String requestKey,
            String requestHash
    ) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO laundry_order
                        (order_no, customer_id, contact_name, contact_phone, status,
                         total_amount_cents, expected_pickup_date, note,
                         received_by, received_at, create_request_key, create_request_hash,
                         version, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 'RECEIVED', ?, ?, ?, ?, UTC_TIMESTAMP(3), ?, ?,
                            0, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setString(1, orderNo);
            statement.setLong(2, customerId);
            statement.setString(3, contactName);
            statement.setString(4, contactPhone);
            statement.setLong(5, totalAmountCents);
            statement.setDate(6, Date.valueOf(expectedPickupDate));
            statement.setString(7, note);
            statement.setLong(8, receivedBy);
            statement.setString(9, requestKey);
            statement.setString(10, requestHash);
            return statement;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    public void insertItem(
            long orderId,
            int itemNo,
            String garmentType,
            String color,
            String conditionNote,
            long serviceItemId,
            String serviceName,
            long priceCents
    ) {
        jdbcTemplate.update("""
                INSERT INTO order_item
                    (order_id, item_no, garment_type, color, condition_note,
                     service_item_id, service_name_snapshot, unit_price_cents,
                     created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))
                """, orderId, itemNo, garmentType, color, conditionNote,
                serviceItemId, serviceName, priceCents);
    }

    public List<OrderItemRow> findItems(long orderId) {
        return jdbcTemplate.query("""
                SELECT id, item_no, garment_type, color, condition_note,
                       service_item_id, service_name_snapshot, unit_price_cents
                FROM order_item WHERE order_id = ? ORDER BY item_no
                """, (rs, rowNum) -> new OrderItemRow(
                rs.getLong("id"),
                rs.getInt("item_no"),
                rs.getString("garment_type"),
                rs.getString("color"),
                rs.getString("condition_note"),
                rs.getLong("service_item_id"),
                rs.getString("service_name_snapshot"),
                rs.getLong("unit_price_cents")
        ), orderId);
    }

    public List<OrderEventRow> findEvents(long orderId) {
        return jdbcTemplate.query("""
                SELECT id, actor_id, actor_name_snapshot, event_type, occurred_at, reason,
                       before_data, after_data
                FROM order_event WHERE order_id = ? ORDER BY occurred_at, id
                """, (rs, rowNum) -> new OrderEventRow(
                rs.getLong("id"),
                rs.getLong("actor_id"),
                rs.getString("actor_name_snapshot"),
                rs.getString("event_type"),
                rs.getObject("occurred_at", LocalDateTime.class),
                rs.getString("reason"),
                rs.getString("before_data"),
                rs.getString("after_data")
        ), orderId);
    }

    public void insertEvent(
            long orderId,
            long actorId,
            String actorName,
            String eventType,
            String reason,
            String beforeData,
            String afterData
    ) {
        jdbcTemplate.update("""
                INSERT INTO order_event
                    (order_id, actor_id, actor_name_snapshot, event_type, occurred_at,
                     reason, before_data, after_data)
                VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3), ?, CAST(? AS JSON), CAST(? AS JSON))
                """, orderId, actorId, actorName, eventType, reason, beforeData, afterData);
    }

    public int markWashing(long id, long version) {
        return jdbcTemplate.update("""
                UPDATE laundry_order
                SET status = 'WASHING', washing_started_at = UTC_TIMESTAMP(3),
                    version = version + 1, updated_at = UTC_TIMESTAMP(3)
                WHERE id = ? AND status = 'RECEIVED' AND version = ?
                """, id, version);
    }

    public int markReady(long id, long version) {
        return jdbcTemplate.update("""
                UPDATE laundry_order
                SET status = 'READY', ready_at = UTC_TIMESTAMP(3),
                    version = version + 1, updated_at = UTC_TIMESTAMP(3)
                WHERE id = ? AND status = 'WASHING' AND version = ?
                """, id, version);
    }

    public int markCompleted(long id, long actorId, long version) {
        return jdbcTemplate.update("""
                UPDATE laundry_order
                SET status = 'COMPLETED', delivered_by = ?, delivered_at = UTC_TIMESTAMP(3),
                    version = version + 1, updated_at = UTC_TIMESTAMP(3)
                WHERE id = ? AND status = 'READY' AND version = ?
                """, actorId, id, version);
    }

    public int markCancelled(long id, long actorId, String reason, long version) {
        return jdbcTemplate.update("""
                UPDATE laundry_order
                SET status = 'CANCELLED', cancelled_by = ?, cancelled_at = UTC_TIMESTAMP(3),
                    cancel_reason = ?, version = version + 1, updated_at = UTC_TIMESTAMP(3)
                WHERE id = ? AND status = 'RECEIVED' AND version = ?
                """, actorId, reason, id, version);
    }

    private Optional<OrderHeader> queryHeader(String sql, Object value) {
        return jdbcTemplate.query(sql, (rs, rowNum) -> new OrderHeader(
                rs.getLong("id"),
                rs.getString("order_no"),
                rs.getLong("customer_id"),
                rs.getString("contact_name"),
                rs.getString("contact_phone"),
                rs.getString("status"),
                rs.getLong("total_amount_cents"),
                rs.getObject("expected_pickup_date", LocalDate.class),
                rs.getString("note"),
                rs.getLong("received_by"),
                rs.getString("received_by_name"),
                rs.getObject("received_at", LocalDateTime.class),
                rs.getObject("washing_started_at", LocalDateTime.class),
                rs.getObject("ready_at", LocalDateTime.class),
                nullableLong(rs, "delivered_by"),
                rs.getString("delivered_by_name"),
                rs.getObject("delivered_at", LocalDateTime.class),
                nullableLong(rs, "cancelled_by"),
                rs.getString("cancelled_by_name"),
                rs.getObject("cancelled_at", LocalDateTime.class),
                rs.getString("cancel_reason"),
                rs.getString("create_request_key"),
                rs.getString("create_request_hash"),
                rs.getLong("version")
        ), value).stream().findFirst();
    }

    private Long nullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        Object value = rs.getObject(column);
        return value == null ? null : ((Number) value).longValue();
    }

    public record OrderSummary(
            long id,
            String orderNo,
            String contactName,
            String contactPhone,
            String status,
            long totalAmountCents,
            LocalDate expectedPickupDate,
            LocalDateTime receivedAt,
            boolean paid
    ) {
    }

    public record OrderHeader(
            long id,
            String orderNo,
            long customerId,
            String contactName,
            String contactPhone,
            String status,
            long totalAmountCents,
            LocalDate expectedPickupDate,
            String note,
            long receivedBy,
            String receivedByName,
            LocalDateTime receivedAt,
            LocalDateTime washingStartedAt,
            LocalDateTime readyAt,
            Long deliveredBy,
            String deliveredByName,
            LocalDateTime deliveredAt,
            Long cancelledBy,
            String cancelledByName,
            LocalDateTime cancelledAt,
            String cancelReason,
            String createRequestKey,
            String createRequestHash,
            long version
    ) {
    }

    public record OrderItemRow(
            long id,
            int itemNo,
            String garmentType,
            String color,
            String conditionNote,
            long serviceItemId,
            String serviceName,
            long unitPriceCents
    ) {
    }

    public record OrderEventRow(
            long id,
            long actorId,
            String actorName,
            String eventType,
            LocalDateTime occurredAt,
            String reason,
            String beforeData,
            String afterData
    ) {
    }
}
