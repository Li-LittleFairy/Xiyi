package com.xiyi.domain;

import java.time.LocalDateTime;

public record PaymentRecord(
        long id,
        long orderId,
        long amountCents,
        String method,
        LocalDateTime paidAt,
        long receivedBy,
        String receivedByName
) {
}
