package com.xiyi.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xiyi.common.ApiException;
import com.xiyi.common.Hashing;
import com.xiyi.domain.Customer;
import com.xiyi.domain.PaymentRecord;
import com.xiyi.domain.ServiceItem;
import com.xiyi.repository.CustomerRepository;
import com.xiyi.repository.OrderRepository;
import com.xiyi.repository.PaymentRepository;
import com.xiyi.repository.ServiceItemRepository;
import com.xiyi.security.StaffPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class OrderService {

    private static final List<String> STATUSES =
            List.of("RECEIVED", "WASHING", "READY", "COMPLETED", "CANCELLED");

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final ServiceItemRepository serviceItemRepository;
    private final PaymentRepository paymentRepository;
    private final ObjectMapper objectMapper;

    public OrderService(
            OrderRepository orderRepository,
            CustomerRepository customerRepository,
            ServiceItemRepository serviceItemRepository,
            PaymentRepository paymentRepository,
            ObjectMapper objectMapper
    ) {
        this.orderRepository = orderRepository;
        this.customerRepository = customerRepository;
        this.serviceItemRepository = serviceItemRepository;
        this.paymentRepository = paymentRepository;
        this.objectMapper = objectMapper;
    }

    public List<OrderRepository.OrderSummary> search(String status, String keyword) {
        String normalizedStatus = null;
        if (status != null && !status.isBlank()) {
            normalizedStatus = status.trim().toUpperCase(Locale.ROOT);
            if (!STATUSES.contains(normalizedStatus)) {
                throw ApiException.badRequest("未知订单状态");
            }
        }
        return orderRepository.search(normalizedStatus, keyword);
    }

    public OrderDetail get(long id) {
        OrderRepository.OrderHeader header = orderRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("订单不存在"));
        return buildDetail(header);
    }

    @Transactional
    public OrderDetail create(CreateOrderCommand command, StaffPrincipal actor) {
        Customer customer = customerRepository.findById(command.customerId())
                .orElseThrow(() -> ApiException.notFound("顾客不存在"));

        String requestKey = clean(command.requestKey());
        if (requestKey == null) {
            requestKey = UUID.randomUUID().toString();
        }
        String requestHash = Hashing.sha256(canonical(command));

        var existing = orderRepository.findByCreateRequestKey(requestKey);
        if (existing.isPresent()) {
            if (!existing.get().createRequestHash().equals(requestHash)) {
                throw ApiException.conflict("相同请求标识已经用于另一笔订单");
            }
            return buildDetail(existing.get());
        }

        long total = 0;
        java.util.ArrayList<PricedItem> pricedItems = new java.util.ArrayList<>();
        int itemNo = 1;
        for (CreateOrderItemCommand item : command.items()) {
            ServiceItem serviceItem = serviceItemRepository.findById(item.serviceItemId())
                    .orElseThrow(() -> ApiException.notFound("洗护项目不存在：" + item.serviceItemId()));
            if (!serviceItem.enabled()) {
                throw ApiException.conflict("洗护项目已停用：" + serviceItem.name());
            }
            total = Math.addExact(total, serviceItem.standardPriceCents());
            pricedItems.add(new PricedItem(itemNo++, item, serviceItem));
        }

        String orderNo = generateOrderNo();
        long orderId = orderRepository.insertOrder(
                orderNo,
                customer.id(),
                customer.name(),
                customer.phone(),
                total,
                command.expectedPickupDate(),
                clean(command.note()),
                actor.id(),
                requestKey,
                requestHash
        );

        for (PricedItem priced : pricedItems) {
            orderRepository.insertItem(
                    orderId,
                    priced.itemNo(),
                    priced.command().garmentType().trim(),
                    priced.command().color().trim(),
                    priced.command().conditionNote().trim(),
                    priced.serviceItem().id(),
                    priced.serviceItem().name(),
                    priced.serviceItem().standardPriceCents()
            );
        }
        orderRepository.insertEvent(
                orderId, actor.id(), actor.displayName(), "RECEIVED", null,
                json(Map.of()), json(Map.of("status", "RECEIVED"))
        );
        return get(orderId);
    }

    @Transactional
    public OrderDetail changeStatus(long id, String targetStatus, String reason, StaffPrincipal actor) {
        String target = targetStatus.trim().toUpperCase(Locale.ROOT);
        OrderRepository.OrderHeader order = orderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> ApiException.notFound("订单不存在"));
        if (order.status().equals(target)) {
            return buildDetail(order);
        }

        String eventType;
        int updated;
        switch (target) {
            case "WASHING" -> {
                requireCurrent(order, "RECEIVED", "只有已收衣订单可以开始洗护");
                updated = orderRepository.markWashing(id, order.version());
                eventType = "WASHING_STARTED";
            }
            case "READY" -> {
                requireCurrent(order, "WASHING", "只有洗护中的订单可以完成洗护");
                updated = orderRepository.markReady(id, order.version());
                eventType = "WASHING_FINISHED";
            }
            case "COMPLETED" -> {
                requireCurrent(order, "READY", "只有待取衣订单可以交付");
                PaymentRecord payment = paymentRepository.findByOrderId(id)
                        .orElseThrow(() -> ApiException.conflict("订单尚未收款，不能交付"));
                if (payment.amountCents() != order.totalAmountCents()) {
                    throw ApiException.conflict("订单收款金额与应收金额不一致");
                }
                updated = orderRepository.markCompleted(id, actor.id(), order.version());
                eventType = "DELIVERED";
            }
            case "CANCELLED" -> {
                requireCurrent(order, "RECEIVED", "只有已收衣且尚未洗护的订单可以取消");
                if (paymentRepository.findByOrderId(id).isPresent()) {
                    throw ApiException.conflict("已收款订单不能按当前规则直接取消");
                }
                String cleanedReason = clean(reason);
                if (cleanedReason == null) {
                    throw ApiException.badRequest("取消订单必须填写原因");
                }
                updated = orderRepository.markCancelled(id, actor.id(), cleanedReason, order.version());
                eventType = "CANCELLED";
            }
            default -> throw ApiException.badRequest("不支持的目标状态");
        }

        if (updated != 1) {
            throw ApiException.conflict("订单已被其他操作修改，请刷新后重试");
        }
        orderRepository.insertEvent(
                id, actor.id(), actor.displayName(), eventType, clean(reason),
                json(Map.of("status", order.status())), json(Map.of("status", target))
        );
        return get(id);
    }

    private OrderDetail buildDetail(OrderRepository.OrderHeader header) {
        return new OrderDetail(
                header,
                orderRepository.findItems(header.id()),
                paymentRepository.findByOrderId(header.id()).orElse(null),
                orderRepository.findEvents(header.id())
        );
    }

    private String canonical(CreateOrderCommand command) {
        StringBuilder value = new StringBuilder()
                .append(command.customerId()).append('|')
                .append(command.expectedPickupDate()).append('|')
                .append(clean(command.note())).append('|');
        for (CreateOrderItemCommand item : command.items()) {
            value.append(item.serviceItemId()).append(':')
                    .append(item.garmentType().trim()).append(':')
                    .append(item.color().trim()).append(':')
                    .append(item.conditionNote().trim()).append('|');
        }
        return value.toString();
    }

    private String generateOrderNo() {
        String time = DateTimeFormatter.ofPattern("yyyyMMddHHmmss")
                .withZone(ZoneOffset.UTC)
                .format(java.time.Instant.now());
        String suffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
        return "O-" + time + "-" + suffix;
    }

    private void requireCurrent(OrderRepository.OrderHeader order, String expected, String message) {
        if (!order.status().equals(expected)) {
            throw ApiException.conflict(message);
        }
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("订单操作记录序列化失败", exception);
        }
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record PricedItem(int itemNo, CreateOrderItemCommand command, ServiceItem serviceItem) {
    }

    public record CreateOrderCommand(
            long customerId,
            LocalDate expectedPickupDate,
            String note,
            String requestKey,
            List<CreateOrderItemCommand> items
    ) {
    }

    public record CreateOrderItemCommand(
            String garmentType,
            String color,
            String conditionNote,
            long serviceItemId
    ) {
    }

    public record OrderDetail(
            OrderRepository.OrderHeader order,
            List<OrderRepository.OrderItemRow> items,
            PaymentRecord payment,
            List<OrderRepository.OrderEventRow> events
    ) {
    }
}
