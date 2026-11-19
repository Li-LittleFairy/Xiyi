package com.xiyi.service;

import com.xiyi.common.ApiException;
import com.xiyi.domain.Customer;
import com.xiyi.repository.CustomerRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CustomerService {

    private final CustomerRepository repository;

    public CustomerService(CustomerRepository repository) {
        this.repository = repository;
    }

    public List<Customer> search(String keyword) {
        return repository.search(keyword);
    }

    public Customer get(long id) {
        return repository.findById(id).orElseThrow(() -> ApiException.notFound("顾客不存在"));
    }

    public Customer create(String name, String phone, String remark) {
        long id = repository.create(name.trim(), phone.trim(), clean(remark));
        return get(id);
    }

    public Customer update(long id, String name, String phone, String remark, long version) {
        get(id);
        if (repository.update(id, name.trim(), phone.trim(), clean(remark), version) != 1) {
            throw ApiException.conflict("顾客资料已被其他操作修改，请刷新后重试");
        }
        return get(id);
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
