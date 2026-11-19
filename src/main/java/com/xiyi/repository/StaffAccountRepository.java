package com.xiyi.repository;

import com.xiyi.domain.StaffAccount;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

@Repository
public class StaffAccountRepository {

    private final JdbcTemplate jdbcTemplate;

    public StaffAccountRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<StaffAccount> findByUsername(String username) {
        return queryOne("""
                SELECT id, username, password_hash, display_name, role_code, enabled
                FROM staff_account WHERE username = ?
                """, username);
    }

    public Optional<StaffAccount> findById(long id) {
        return queryOne("""
                SELECT id, username, password_hash, display_name, role_code, enabled
                FROM staff_account WHERE id = ?
                """, id);
    }

    public List<StaffAccount> findAll() {
        return jdbcTemplate.query("""
                SELECT id, username, password_hash, display_name, role_code, enabled
                FROM staff_account ORDER BY id
                """, (rs, rowNum) -> map(rs));
    }

    public long create(String username, String passwordHash, String displayName, String roleCode) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO staff_account
                        (username, password_hash, display_name, role_code, enabled,
                         version, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 1, 0, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setString(1, username);
            statement.setString(2, passwordHash);
            statement.setString(3, displayName);
            statement.setString(4, roleCode);
            return statement;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    public void updateEnabled(long id, boolean enabled) {
        int updated = jdbcTemplate.update("""
                UPDATE staff_account
                SET enabled = ?, version = version + 1, updated_at = UTC_TIMESTAMP(3)
                WHERE id = ?
                """, enabled, id);
        requireUpdated(updated);
    }

    public void updateRole(long id, String roleCode) {
        int updated = jdbcTemplate.update("""
                UPDATE staff_account
                SET role_code = ?, version = version + 1, updated_at = UTC_TIMESTAMP(3)
                WHERE id = ?
                """, roleCode, id);
        requireUpdated(updated);
    }

    public void updatePasswordHash(long id, String passwordHash) {
        int updated = jdbcTemplate.update("""
                UPDATE staff_account
                SET password_hash = ?, version = version + 1, updated_at = UTC_TIMESTAMP(3)
                WHERE id = ?
                """, passwordHash, id);
        requireUpdated(updated);
    }

    private Optional<StaffAccount> queryOne(String sql, Object value) {
        return jdbcTemplate.query(sql, (rs, rowNum) -> map(rs), value).stream().findFirst();
    }

    private StaffAccount map(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new StaffAccount(
                rs.getLong("id"),
                rs.getString("username"),
                rs.getString("password_hash"),
                rs.getString("display_name"),
                rs.getString("role_code"),
                rs.getBoolean("enabled")
        );
    }

    private void requireUpdated(int updated) {
        if (updated != 1) {
            throw new IllegalStateException("员工数据更新失败");
        }
    }
}
