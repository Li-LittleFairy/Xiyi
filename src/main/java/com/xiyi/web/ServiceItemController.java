package com.xiyi.web;

import com.xiyi.domain.ServiceItem;
import com.xiyi.service.ServiceItemService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/service-items")
public class ServiceItemController {

    private final ServiceItemService service;

    public ServiceItemController(ServiceItemService service) {
        this.service = service;
    }

    @GetMapping
    public List<ServiceItem> list(@RequestParam(defaultValue = "false") boolean includeDisabled) {
        return service.list(includeDisabled);
    }

    @GetMapping("/{id}")
    public ServiceItem get(@PathVariable long id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceItem create(@Valid @RequestBody ServiceItemRequest request) {
        return service.create(request.code(), request.name(), request.standardPriceCents());
    }

    @PutMapping("/{id}")
    public ServiceItem update(@PathVariable long id, @Valid @RequestBody ServiceItemRequest request) {
        return service.update(
                id, request.code(), request.name(), request.standardPriceCents(), request.version());
    }

    @PatchMapping("/{id}/status")
    public ServiceItem setStatus(@PathVariable long id, @RequestBody ServiceItemStatusRequest request) {
        return service.setEnabled(id, request.enabled());
    }

    public record ServiceItemRequest(
            @NotBlank @Size(max = 32) String code,
            @NotBlank @Size(max = 100) String name,
            @Positive long standardPriceCents,
            @PositiveOrZero long version
    ) {
    }

    public record ServiceItemStatusRequest(boolean enabled) {
    }
}
