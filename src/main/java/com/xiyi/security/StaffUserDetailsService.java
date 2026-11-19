package com.xiyi.security;

import com.xiyi.repository.StaffAccountRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsPasswordService;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class StaffUserDetailsService implements UserDetailsService, UserDetailsPasswordService {

    private final StaffAccountRepository repository;

    public StaffUserDetailsService(StaffAccountRepository repository) {
        this.repository = repository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        String normalized = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
        return repository.findByUsername(normalized)
                .map(StaffPrincipal::from)
                .orElseThrow(() -> new UsernameNotFoundException("账号或密码错误"));
    }

    @Override
    public UserDetails updatePassword(UserDetails user, String newPassword) {
        if (!(user instanceof StaffPrincipal principal)) {
            throw new IllegalArgumentException("无法更新未知身份的密码");
        }
        repository.updatePasswordHash(principal.id(), newPassword);
        return loadUserByUsername(principal.getUsername());
    }
}
