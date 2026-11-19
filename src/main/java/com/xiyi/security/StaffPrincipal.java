package com.xiyi.security;

import com.xiyi.domain.StaffAccount;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.io.Serial;
import java.util.Collection;
import java.util.List;

public final class StaffPrincipal implements UserDetails {

    @Serial
    private static final long serialVersionUID = 1L;

    private final long id;
    private final String username;
    private final String password;
    private final String displayName;
    private final String roleCode;
    private final boolean enabled;
    private final List<GrantedAuthority> authorities;

    private StaffPrincipal(StaffAccount account) {
        this.id = account.id();
        this.username = account.username();
        this.password = account.passwordHash();
        this.displayName = account.displayName();
        this.roleCode = account.roleCode();
        this.enabled = account.enabled();
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + roleCode));
    }

    public static StaffPrincipal from(StaffAccount account) {
        if (!List.of("MANAGER", "STAFF").contains(account.roleCode())) {
            throw new IllegalArgumentException("未知员工角色");
        }
        return new StaffPrincipal(account);
    }

    public long id() {
        return id;
    }

    public String displayName() {
        return displayName;
    }

    public String roleCode() {
        return roleCode;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
