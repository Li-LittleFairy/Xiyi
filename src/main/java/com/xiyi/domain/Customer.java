package com.xiyi.domain;

public record Customer(
        long id,
        String name,
        String phone,
        String remark,
        long version
) {
}
