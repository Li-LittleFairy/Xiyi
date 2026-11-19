# Xiyi 洗衣店管理系统

Java 17 + Maven 工程骨架，当前在本机开发演示，正式部署形态之后确定（见 `docs/03-ADR/0001-local-development-first.md`）。

## 从这里开始

- 文档总入口：`docs/README.md`（所有 `.md` 与 `.docx` 文档都在 `docs/` 下分类存放）
- 协作与边界：`AGENTS.md`、`docs/02-开发文档/project-boundaries.md`
- 建表脚本：`database/mysql/V001__create_core_tables.sql`（已在本机 MySQL 8.0.44 的 xiyi_dev 库执行，记录见 `docs/04-组件说明/database-mysql/execution-2026-11-19.md`）
- 展示原型：直接用浏览器打开 `laundry-prototype/dist/index.html`
- 员工登录：Session 登录与角色识别，接口说明见 `docs/02-开发文档/authentication-api.md`
- 后端接口：七类 Controller、权限和请求示例见 `docs/02-开发文档/backend-api-catalog.md`

## 目录

| 路径 | 内容 |
| --- | --- |
| `src/`、`pom.xml` | 后端工程骨架 |
| `database/mysql/` | 建表与校验脚本（说明文档在 `docs/04-组件说明/database-mysql/`） |
| `laundry-prototype/dist/` | 顾客端与门店端双端展示原型（说明文档在 `docs/04-组件说明/laundry-prototype/`） |
| `docs/` | 需求来源材料、开发文档、ADR、组件说明 |
