package com.xiyi.web;

import com.xiyi.repository.OrderRepository;
import com.xiyi.security.StaffPrincipal;
import com.xiyi.service.OrderService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService service;

    public OrderController(OrderService service) {
        this.service = service;
    }

    @GetMapping
    public List<OrderRepository.OrderSummary> search(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword
    ) {
        return service.search(status, keyword);
    }

    @GetMapping("/{id}")
    public OrderService.OrderDetail get(@PathVariable long id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderService.OrderDetail create(
            @Valid @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal StaffPrincipal actor
    ) {
        List<OrderService.CreateOrderItemCommand> items = request.items().stream()
                .map(item -> new OrderService.CreateOrderItemCommand(
                        item.garmentType(), item.color(), item.conditionNote(), item.serviceItemId()))
                .toList();
        return service.create(new OrderService.CreateOrderCommand(
                request.customerId(),
                request.expectedPickupDate(),
                request.note(),
                request.requestKey(),
                items
        ), actor);
    }

    @PatchMapping("/{id}/status")
    public OrderService.OrderDetail changeStatus(
            @PathVariable long id,
            @Valid @RequestBody ChangeOrderStatusRequest request,
            @AuthenticationPrincipal StaffPrincipal actor
    ) {
        return service.changeStatus(id, request.targetStatus(), request.reason(), actor);
    }

    public record CreateOrderRequest(
            @Positive long customerId,
            @NotNull @FutureOrPresent LocalDate expectedPickupDate,
            @Size(max = 1000) String note,
            @Size(max = 64) String requestKey,
            @NotEmpty @Size(max = 100) List<@Valid CreateOrderItemRequest> items
    ) {
    }

    public record CreateOrderItemRequest(
            @NotBlank @Size(max = 50) String garmentType,
            @NotBlank @Size(max = 50) String color,
            @NotBlank @Size(max = 500) String conditionNote,
            @Positive long serviceItemId
    ) {
    }

    public record ChangeOrderStatusRequest(
            @NotBlank String targetStatus,
            @Size(max = 500) String reason
    ) {
    }
}
