package com.xiyi.repository;

import com.xiyi.domain.ServiceItem;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

@Repository
public class ServiceItemRepository {

    private final JdbcTemplate jdbcTemplate;

    public ServiceItemRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<ServiceItem> findAll(boolean includeDisabled) {
        String sql = """
                SELECT id, code, name, standard_price_cents, enabled, version
                FROM service_item
                """ + (includeDisabled ? "" : " WHERE enabled = 1 ") + " ORDER BY id";
        return jdbcTemplate.query(sql, (rs, rowNum) -> map(rs));
    }

    public Optional<ServiceItem> findById(long id) {
        return jdbcTemplate.query("""
                SELECT id, code, name, standard_price_cents, enabled, version
                FROM service_item WHERE id = ?
                """, (rs, rowNum) -> map(rs), id).stream().findFirst();
    }

    public long create(String code, String name, long priceCents) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO service_item
                        (code, name, standard_price_cents, enabled, version, created_at, updated_at)
                    VALUES (?, ?, ?, 1, 0, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setString(1, code);
            statement.setString(2, name);
            statement.setLong(3, priceCents);
            return statement;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    public int update(long id, String code, String name, long priceCents, long version) {
        return jdbcTemplate.update("""
                UPDATE service_item
                SET code = ?, name = ?, standard_price_cents = ?, version = version + 1,
                    updated_at = UTC_TIMESTAMP(3)
                WHERE id = ? AND version = ?
                """, code, name, priceCents, id, version);
    }

    public void updateEnabled(long id, boolean enabled) {
        int updated = jdbcTemplate.update("""
                UPDATE service_item
                SET enabled = ?, version = version + 1, updated_at = UTC_TIMESTAMP(3)
                WHERE id = ?
                """, enabled, id);
        if (updated != 1) {
            throw new IllegalStateException("洗护项目更新失败");
        }
    }

    private ServiceItem map(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new ServiceItem(
                rs.getLong("id"),
                rs.getString("code"),
                rs.getString("name"),
                rs.getLong("standard_price_cents"),
                rs.getBoolean("enabled"),
                rs.getLong("version")
        );
    }
}
