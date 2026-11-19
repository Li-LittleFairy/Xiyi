# 后端接口目录（一期基础版）

更新日期：2026-11-19。接口统一使用 `/api` 前缀，金额单位为人民币分，时间由后端按 UTC 保存。

## 1. 调用顺序

浏览器或 IDEA HTTP Client 先调用登录接口。登录成功后服务端通过 `JSESSIONID` Cookie 识别当前员工；调用新增、修改、状态变更和退出接口前，再调用一次 CSRF 接口，并把返回的令牌放入其指定请求头。查询接口不需要 CSRF 令牌。

1. `POST /api/auth/login`：登录并建立 Session。
2. `GET /api/auth/csrf`：取得修改请求使用的 CSRF 请求头和令牌。
3. 调用顾客、项目、订单、收款等接口；所有请求继续携带登录 Cookie。
4. `POST /api/auth/logout`：退出。

## 2. 接口分类

### 认证 AuthController

| 方法 | 路径 | 用途 | 权限 |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | 员工登录 | 匿名 |
| GET | `/api/auth/me` | 当前员工身份 | 已登录 |
| GET | `/api/auth/csrf` | 获取修改请求令牌 | 匿名或已登录 |
| POST | `/api/auth/logout` | 退出当前会话 | 已登录 |

### 员工 StaffController

| 方法 | 路径 | 用途 | 权限 |
| --- | --- | --- | --- |
| GET | `/api/staff` | 员工列表 | 店长 |
| GET | `/api/staff/{id}` | 员工详情 | 店长 |
| POST | `/api/staff` | 新增员工 | 店长 |
| PATCH | `/api/staff/{id}/status` | 启用或停用员工 | 店长 |
| PATCH | `/api/staff/{id}/role` | 修改固定角色 | 店长 |

接口不会返回密码摘要。角色当前只允许 `MANAGER` 和 `STAFF`。

### 顾客 CustomerController

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/customers?keyword=` | 按姓名或手机号搜索，最多100条 |
| GET | `/api/customers/{id}` | 顾客详情 |
| POST | `/api/customers` | 新增顾客 |
| PUT | `/api/customers/{id}` | 修改顾客资料 |

修改时携带查询结果中的 `version`；数据已被别人修改时返回409，避免互相覆盖。历史订单引用顾客，因此不提供物理删除接口。

### 洗护项目 ServiceItemController

| 方法 | 路径 | 用途 | 权限 |
| --- | --- | --- | --- |
| GET | `/api/service-items` | 查询启用项目 | 已登录 |
| GET | `/api/service-items?includeDisabled=true` | 查询全部项目 | 已登录 |
| GET | `/api/service-items/{id}` | 项目详情 | 已登录 |
| POST | `/api/service-items` | 新增项目 | 店长 |
| PUT | `/api/service-items/{id}` | 修改名称和标准价 | 店长 |
| PATCH | `/api/service-items/{id}/status` | 启用或停用 | 店长 |

订单保存项目名称和成交价快照，项目以后调价不会改变历史订单金额。

### 订单 OrderController

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/orders?status=&keyword=` | 按状态、订单号、姓名或手机号查询 |
| GET | `/api/orders/{id}` | 订单、衣物、收款和操作历史详情 |
| POST | `/api/orders` | 创建订单 |
| PATCH | `/api/orders/{id}/status` | 流转订单状态或取消 |

创建订单示例：

```json
{
  "customerId": 1,
  "expectedPickupDate": "2026-11-22",
  "note": "加急",
  "requestKey": "由前端为本次保存生成的唯一值",
  "items": [
    {
      "garmentType": "外套",
      "color": "黑色",
      "conditionNote": "袖口轻微磨损",
      "serviceItemId": 1
    }
  ]
}
```

前端不提交价格和经办员工。后端读取当前员工、查询最新项目价格、计算总价，并在一个事务中保存订单、衣物明细和收衣事件。状态支持 `RECEIVED → WASHING → READY → COMPLETED`；未付款的 `RECEIVED` 订单可带原因改为 `CANCELLED`。

### 收款 PaymentController

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/payments?orderId=` | 查询收款记录 |
| GET | `/api/payments/{id}` | 收款详情 |
| POST | `/api/payments` | 按订单应收金额登记一次付清 |

登记收款请求只需要订单、方式和防重复标识：

```json
{
  "orderId": 1,
  "method": "CASH",
  "requestKey": "由前端为本次收款生成的唯一值"
}
```

方式只允许 `CASH` 和 `OFFLINE_ELECTRONIC`。金额由后端读取订单应收金额，当前每张订单最多一条收款记录。退款规则和退款表尚未确定，本版不伪造退款接口。

### 工作台 DashboardController

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/dashboard/summary` | 各状态订单数量、今日订单数和今日实收 |

## 3. 通用响应约定

- `200`：查询或修改成功。
- `201`：创建成功。
- `400`：参数格式或目标状态不正确。
- `401`：没有登录或账号密码错误。
- `403`：员工角色无权操作。
- `404`：目标记录不存在。
- `409`：重复数据、状态冲突或版本冲突。

删除历史订单、顾客、收款和操作记录均不属于当前接口；这些数据用于业务追溯。
