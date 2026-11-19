package com.xiyi.repository;

import com.xiyi.domain.Customer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

@Repository
public class CustomerRepository {

    private final JdbcTemplate jdbcTemplate;

    public CustomerRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Customer> search(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return jdbcTemplate.query("""
                    SELECT id, name, phone, remark, version
                    FROM customer ORDER BY updated_at DESC, id DESC LIMIT 100
                    """, (rs, rowNum) -> map(rs));
        }
        String like = "%" + keyword.trim() + "%";
        return jdbcTemplate.query("""
                SELECT id, name, phone, remark, version
                FROM customer
                WHERE name LIKE ? OR phone LIKE ?
                ORDER BY updated_at DESC, id DESC LIMIT 100
                """, (rs, rowNum) -> map(rs), like, like);
    }

    public Optional<Customer> findById(long id) {
        return jdbcTemplate.query("""
                SELECT id, name, phone, remark, version
                FROM customer WHERE id = ?
                """, (rs, rowNum) -> map(rs), id).stream().findFirst();
    }

    public long create(String name, String phone, String remark) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO customer (name, phone, remark, version, created_at, updated_at)
                    VALUES (?, ?, ?, 0, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setString(1, name);
            statement.setString(2, phone);
            statement.setString(3, remark);
            return statement;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    public int update(long id, String name, String phone, String remark, long version) {
        return jdbcTemplate.update("""
                UPDATE customer
                SET name = ?, phone = ?, remark = ?, version = version + 1,
                    updated_at = UTC_TIMESTAMP(3)
                WHERE id = ? AND version = ?
                """, name, phone, remark, id, version);
    }

    private Customer map(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Customer(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("phone"),
                rs.getString("remark"),
                rs.getLong("version")
        );
    }
}
