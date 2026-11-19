package com.xiyi.web;

import com.xiyi.domain.PaymentRecord;
import com.xiyi.security.StaffPrincipal;
import com.xiyi.service.PaymentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService service;

    public PaymentController(PaymentService service) {
        this.service = service;
    }

    @GetMapping
    public List<PaymentRecord> list(@RequestParam(required = false) Long orderId) {
        return service.list(orderId);
    }

    @GetMapping("/{id}")
    public PaymentRecord get(@PathVariable long id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentRecord create(
            @Valid @RequestBody CreatePaymentRequest request,
            @AuthenticationPrincipal StaffPrincipal actor
    ) {
        return service.create(request.orderId(), request.method(), request.requestKey(), actor);
    }

    public record CreatePaymentRequest(
            @Positive long orderId,
            @NotBlank String method,
            @Size(max = 64) String requestKey
    ) {
    }
}
