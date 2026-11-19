package com.xiyi.web;

import com.xiyi.domain.StaffAccount;
import com.xiyi.service.StaffService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/staff")
public class StaffController {

    private final StaffService service;

    public StaffController(StaffService service) {
        this.service = service;
    }

    @GetMapping
    public List<StaffResponse> list() {
        return service.list().stream().map(StaffResponse::from).toList();
    }

    @GetMapping("/{id}")
    public StaffResponse get(@PathVariable long id) {
        return StaffResponse.from(service.get(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StaffResponse create(@Valid @RequestBody CreateStaffRequest request) {
        return StaffResponse.from(service.create(
                request.username(), request.password(), request.displayName(), request.roleCode()));
    }

    @PatchMapping("/{id}/status")
    public StaffResponse setStatus(@PathVariable long id, @Valid @RequestBody StaffStatusRequest request) {
        return StaffResponse.from(service.setEnabled(id, request.enabled()));
    }

    @PatchMapping("/{id}/role")
    public StaffResponse setRole(@PathVariable long id, @Valid @RequestBody StaffRoleRequest request) {
        return StaffResponse.from(service.setRole(id, request.roleCode()));
    }

    public record CreateStaffRequest(
            @NotBlank @Size(max = 64)
            @Pattern(regexp = "[A-Za-z0-9._-]+", message = "账号只能包含字母、数字、点、下划线或短横线")
            String username,
            @NotBlank @Size(min = 8, max = 128) String password,
            @NotBlank @Size(max = 50) String displayName,
            @NotBlank String roleCode
    ) {
    }

    public record StaffStatusRequest(boolean enabled) {
    }

    public record StaffRoleRequest(@NotBlank String roleCode) {
    }

    public record StaffResponse(long id, String username, String displayName, String roleCode, boolean enabled) {
        static StaffResponse from(StaffAccount staff) {
            return new StaffResponse(
                    staff.id(), staff.username(), staff.displayName(), staff.roleCode(), staff.enabled());
        }
    }
}
