package com.xiyi.service;

import com.xiyi.common.ApiException;
import com.xiyi.domain.ServiceItem;
import com.xiyi.repository.ServiceItemRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class ServiceItemService {

    private final ServiceItemRepository repository;

    public ServiceItemService(ServiceItemRepository repository) {
        this.repository = repository;
    }

    public List<ServiceItem> list(boolean includeDisabled) {
        return repository.findAll(includeDisabled);
    }

    public ServiceItem get(long id) {
        return repository.findById(id).orElseThrow(() -> ApiException.notFound("洗护项目不存在"));
    }

    public ServiceItem create(String code, String name, long priceCents) {
        long id = repository.create(normalizeCode(code), name.trim(), priceCents);
        return get(id);
    }

    public ServiceItem update(long id, String code, String name, long priceCents, long version) {
        get(id);
        if (repository.update(id, normalizeCode(code), name.trim(), priceCents, version) != 1) {
            throw ApiException.conflict("洗护项目已被其他操作修改，请刷新后重试");
        }
        return get(id);
    }

    public ServiceItem setEnabled(long id, boolean enabled) {
        get(id);
        repository.updateEnabled(id, enabled);
        return get(id);
    }

    private String normalizeCode(String code) {
        return code.trim().toUpperCase(Locale.ROOT);
    }
}
