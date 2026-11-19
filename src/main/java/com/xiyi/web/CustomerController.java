package com.xiyi.web;

import com.xiyi.domain.Customer;
import com.xiyi.service.CustomerService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
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
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService service;

    public CustomerController(CustomerService service) {
        this.service = service;
    }

    @GetMapping
    public List<Customer> search(@RequestParam(required = false) String keyword) {
        return service.search(keyword);
    }

    @GetMapping("/{id}")
    public Customer get(@PathVariable long id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Customer create(@Valid @RequestBody CustomerRequest request) {
        return service.create(request.name(), request.phone(), request.remark());
    }

    @PutMapping("/{id}")
    public Customer update(@PathVariable long id, @Valid @RequestBody CustomerRequest request) {
        return service.update(id, request.name(), request.phone(), request.remark(), request.version());
    }

    public record CustomerRequest(
            @NotBlank @Size(max = 50) String name,
            @NotBlank @Size(max = 32) String phone,
            @Size(max = 500) String remark,
            @PositiveOrZero long version
    ) {
    }
}
