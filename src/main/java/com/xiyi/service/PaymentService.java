package com.xiyi.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xiyi.common.ApiException;
import com.xiyi.common.Hashing;
import com.xiyi.domain.PaymentRecord;
import com.xiyi.repository.OrderRepository;
import com.xiyi.repository.PaymentRepository;
import com.xiyi.security.StaffPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {

    private static final List<String> METHODS = List.of("CASH", "OFFLINE_ELECTRONIC");

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final ObjectMapper objectMapper;

    public PaymentService(
            PaymentRepository paymentRepository,
            OrderRepository orderRepository,
            ObjectMapper objectMapper
    ) {
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
        this.objectMapper = objectMapper;
    }

    public List<PaymentRecord> list(Long orderId) {
        return paymentRepository.findAll(orderId);
    }

    public PaymentRecord get(long id) {
        return paymentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("收款记录不存在"));
    }

    @Transactional
    public PaymentRecord create(long orderId, String method, String requestKey, StaffPrincipal actor) {
        String normalizedMethod = method.trim().toUpperCase(Locale.ROOT);
        if (!METHODS.contains(normalizedMethod)) {
            throw ApiException.badRequest("收款方式只能是CASH或OFFLINE_ELECTRONIC");
        }
        String normalizedKey = requestKey == null || requestKey.isBlank()
                ? UUID.randomUUID().toString()
                : requestKey.trim();
        String requestHash = Hashing.sha256(orderId + "|" + normalizedMethod);

        var sameRequest = paymentRepository.findByRequestKey(normalizedKey);
        if (sameRequest.isPresent()) {
            if (!sameRequest.get().requestHash().equals(requestHash)) {
                throw ApiException.conflict("相同请求标识已经用于另一笔收款");
            }
            return sameRequest.get().payment();
        }

        OrderRepository.OrderHeader order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> ApiException.notFound("订单不存在"));
        if (List.of("CANCELLED", "COMPLETED").contains(order.status())) {
            throw ApiException.conflict("当前订单状态不能登记收款");
        }
        if (paymentRepository.findByOrderId(orderId).isPresent()) {
            throw ApiException.conflict("该订单已经完成收款");
        }

        long paymentId = paymentRepository.create(
                orderId,
                order.totalAmountCents(),
                normalizedMethod,
                actor.id(),
                normalizedKey,
                requestHash
        );
        orderRepository.insertEvent(
                orderId, actor.id(), actor.displayName(), "PAYMENT_RECORDED", null,
                json(Map.of()),
                json(Map.of("amountCents", order.totalAmountCents(), "method", normalizedMethod))
        );
        return get(paymentId);
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("收款操作记录序列化失败", exception);
        }
    }
}
