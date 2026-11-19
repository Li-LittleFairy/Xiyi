# 首次建库建表与验证记录

执行日期：2026-11-19（Asia/Shanghai）。用户已授权在新工作空间维护项目文件并建表。

## 执行对象

- 工作空间：`D:\Project\TestProject\xiyi`。
- 连接：本机MySQL，端口3306，客户端登录配置名 `xiyi`；本次迁移账号为 `root@localhost`，没有在仓库保存密码。
- 服务端实际版本：MySQL 8.0.44。
- 项目库：`xiyi_dev`。执行前查询确认该库不存在，随后单独创建；没有修改其他业务库。
- 字符集与排序规则：`utf8mb4` / `utf8mb4_unicode_ci`。
- 表引擎：InnoDB。
- SQL模式包含 STRICT_TRANS_TABLES、ONLY_FULL_GROUP_BY、NO_ZERO_DATE、NO_ZERO_IN_DATE、ERROR_FOR_DIVISION_BY_ZERO、NO_ENGINE_SUBSTITUTION。

## 已执行操作

1. 创建项目专用开发库 `xiyi_dev`。
2. 一次执行 `database/mysql/V001__create_core_tables.sql`，七张表全部创建成功。
3. 查询实际表及约束元数据，并执行 `database/mysql/verify_schema.py` 进行数据库层验证。

已执行脚本SHA-256：

`6421DABD8D60515A4931A0319DCC4F92AF528914850EAF9C0A3FAF609950EFB2`

该文件现作为已执行的V001基线保留；头部“Draft/Not executed”是生成时的历史注释，当前执行状态以本记录为准。不要再编辑V001来修改已有表，也不要在同一库重新运行整份脚本；后续结构变化使用新的迁移文件。自动迁移工具尚未接入。

## 创建结果

| 表名 | 用途 | 验证结束后的记录数 |
| --- | --- | ---: |
| staff_account | 员工账号 | 0 |
| customer | 客户 | 0 |
| service_item | 洗护项目 | 0 |
| laundry_order | 订单 | 0 |
| order_item | 衣物明细 | 0 |
| payment_record | 实际收款 | 0 |
| order_event | 操作记录 | 0 |

实际元数据：7个主键、7个唯一约束、10个外键、17个CHECK约束。

## 验证结果

正常流程8项断言通过：3件衣物合计14800分、初始未收款、中文瑕疵保存、项目调价不改变历史成交价、一次收款14800分、收款后仍待取、完成状态及交付字段、5条对应事件。

10项异常操作被预期约束拒绝：非法员工角色、负项目价、非法订单状态、无时间直接标记交付、无原因取消、重复订单号、重复单内衣物序号、同单二次收款、引用不存在客户、删除已被订单引用的客户。

所有测试均在事务中进行：正常测试显式ROLLBACK，预期错误的会话退出触发未提交事务回滚。复核七张表均为空。AUTO_INCREMENT计数可能因为验证而增长，出现ID跳号正常，不代表残留测试记录。

## 验证边界及后续工作

- 本次是数据库层验证，未实现或验证后端权限、完整状态转换规则、足额校验、请求重试处理和并发业务。
- 未进行数据库重启或备份恢复演练，也没有初始化正式店长、客户或项目数据。
- 未配置应用专用账号或Spring Boot数据源。本次使用root执行迁移不代表应用应使用root运行。
- 后续接入工程时，应确定迁移工具对现有V001的基线管理方式，避免自动启动时重复建表。

## 在数据库工具中查看

连接本机MySQL，选择/勾选 `xiyi_dev` 并刷新，然后展开Tables即可看到七张表。也可以执行：

```sql
SHOW TABLES FROM xiyi_dev;
```

`database/mysql/verify_schema.py`只针对新建空开发库，可通过 `python database/mysql/verify_schema.py` 运行，依赖Python标准库、PATH中的mysql客户端和本机 `xiyi` 登录配置。已有业务数据时脚本会停止，不要为了重跑验证而清库。
