# 员工登录与身份识别接口

日期：2026-11-19。实现依据：ADR-0003。

## 接口

| 方法与路径 | 是否匿名 | 用途 |
| --- | --- | --- |
| POST `/api/auth/login` | 是 | 使用账号密码登录，成功后建立Session |
| GET `/api/auth/me` | 否 | 返回当前员工ID、账号、姓名和角色 |
| GET `/api/auth/csrf` | 是 | 获取修改请求需要的CSRF请求头和令牌 |
| POST `/api/auth/logout` | 否 | 注销当前Session，需要CSRF令牌 |

登录请求示例：

```json
{
  "username": "employee-account",
  "password": "employee-password"
}
```

登录成功响应示例：

```json
{
  "id": 1,
  "username": "employee-account",
  "displayName": "演示员工",
  "roleCode": "MANAGER"
}
```

账号或密码错误统一返回401和 `INVALID_CREDENTIALS`，避免泄露账号是否存在。未登录访问受保护接口返回401；已登录但角色不足返回403。

## 浏览器调用约定

前端请求需要携带Cookie。登录端点不要求CSRF；登录后进行POST、PUT、PATCH、DELETE前，调用 `/api/auth/csrf`，将响应中的token放入响应所示的请求头（默认 `X-XSRF-TOKEN`）。退出也遵循该规则。

业务Controller后续可通过 `@AuthenticationPrincipal StaffPrincipal principal` 获取当前员工ID和角色。客户端提交的经办人ID不能作为可信身份。

## 密码迁移

新密码使用BCrypt。数据库中既有的无前缀SHA-256演示哈希仅用于兼容迁移；员工首次成功登录后会自动升级为带 `{bcrypt}` 前缀的哈希。明文密码不进入接口响应、日志或仓库。
