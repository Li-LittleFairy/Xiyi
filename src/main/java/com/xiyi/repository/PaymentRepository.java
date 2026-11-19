package com.xiyi.repository;

import com.xiyi.domain.PaymentRecord;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class PaymentRepository {

    private static final String SELECT = """
            SELECT p.id, p.order_id, p.amount_cents, p.method, p.paid_at,
                   p.received_by, s.display_name AS received_by_name
            FROM payment_record p
            JOIN staff_account s ON s.id = p.received_by
            """;

    private final JdbcTemplate jdbcTemplate;

    public PaymentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<PaymentRecord> findById(long id) {
        return queryOne(SELECT + " WHERE p.id = ?", id);
    }

    public Optional<PaymentRecord> findByOrderId(long orderId) {
        return queryOne(SELECT + " WHERE p.order_id = ?", orderId);
    }

    public Optional<PaymentWithRequest> findByRequestKey(String requestKey) {
        return jdbcTemplate.query("""
                SELECT p.id, p.order_id, p.amount_cents, p.method, p.paid_at,
                       p.received_by, s.display_name AS received_by_name,
                       p.request_key, p.request_hash
                FROM payment_record p
                JOIN staff_account s ON s.id = p.received_by
                WHERE p.request_key = ?
                """, (rs, rowNum) -> new PaymentWithRequest(
                map(rs), rs.getString("request_key"), rs.getString("request_hash")
        ), requestKey).stream().findFirst();
    }

    public List<PaymentRecord> findAll(Long orderId) {
        if (orderId != null) {
            return jdbcTemplate.query(
                    SELECT + " WHERE p.order_id = ? ORDER BY p.paid_at DESC, p.id DESC",
                    (rs, rowNum) -> map(rs), orderId);
        }
        return jdbcTemplate.query(
                SELECT + " ORDER BY p.paid_at DESC, p.id DESC LIMIT 100",
                (rs, rowNum) -> map(rs));
    }

    public long create(
            long orderId,
            long amountCents,
            String method,
            long receivedBy,
            String requestKey,
            String requestHash
    ) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO payment_record
                        (order_id, amount_cents, method, paid_at, received_by,
                         request_key, request_hash, created_at)
                    VALUES (?, ?, ?, UTC_TIMESTAMP(3), ?, ?, ?, UTC_TIMESTAMP(3))
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, orderId);
            statement.setLong(2, amountCents);
            statement.setString(3, method);
            statement.setLong(4, receivedBy);
            statement.setString(5, requestKey);
            statement.setString(6, requestHash);
            return statement;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    private Optional<PaymentRecord> queryOne(String sql, Object value) {
        return jdbcTemplate.query(sql, (rs, rowNum) -> map(rs), value).stream().findFirst();
    }

    private PaymentRecord map(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new PaymentRecord(
                rs.getLong("id"),
                rs.getLong("order_id"),
                rs.getLong("amount_cents"),
                rs.getString("method"),
                rs.getObject("paid_at", LocalDateTime.class),
                rs.getLong("received_by"),
                rs.getString("received_by_name")
        );
    }

    public record PaymentWithRequest(PaymentRecord payment, String requestKey, String requestHash) {
    }
}
