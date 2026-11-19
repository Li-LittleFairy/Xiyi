package com.xiyi.domain;

/**
 * 门店员工账号，对应 staff_account 表。
 */
public record StaffAccount(
        long id,
        String username,
        String passwordHash,
        String displayName,
        String roleCode,
        boolean enabled
) {
}
