package com.xiyi.service;

import com.xiyi.common.ApiException;
import com.xiyi.domain.StaffAccount;
import com.xiyi.repository.StaffAccountRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class StaffService {

    private static final List<String> ROLES = List.of("MANAGER", "STAFF");

    private final StaffAccountRepository repository;
    private final PasswordEncoder passwordEncoder;

    public StaffService(StaffAccountRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<StaffAccount> list() {
        return repository.findAll();
    }

    public StaffAccount get(long id) {
        return repository.findById(id).orElseThrow(() -> ApiException.notFound("员工不存在"));
    }

    public StaffAccount create(String username, String password, String displayName, String roleCode) {
        String normalizedUsername = username.trim().toLowerCase(Locale.ROOT);
        String normalizedRole = normalizeRole(roleCode);
        if (repository.findByUsername(normalizedUsername).isPresent()) {
            throw ApiException.conflict("员工账号已经存在");
        }
        long id = repository.create(
                normalizedUsername,
                passwordEncoder.encode(password),
                displayName.trim(),
                normalizedRole
        );
        return get(id);
    }

    public StaffAccount setEnabled(long id, boolean enabled) {
        get(id);
        repository.updateEnabled(id, enabled);
        return get(id);
    }

    public StaffAccount setRole(long id, String roleCode) {
        get(id);
        repository.updateRole(id, normalizeRole(roleCode));
        return get(id);
    }

    private String normalizeRole(String roleCode) {
        String normalized = roleCode.trim().toUpperCase(Locale.ROOT);
        if (!ROLES.contains(normalized)) {
            throw ApiException.badRequest("角色只能是MANAGER或STAFF");
        }
        return normalized;
    }
}
