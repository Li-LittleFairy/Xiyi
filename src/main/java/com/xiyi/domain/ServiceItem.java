package com.xiyi.domain;

/** 金额单位统一为人民币分。 */
public record ServiceItem(
        long id,
        String code,
        String name,
        long standardPriceCents,
        boolean enabled,
        long version
) {
}
