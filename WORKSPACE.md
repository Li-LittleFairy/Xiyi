# 洗衣管理开发工作空间

用户于2026-11-19指定 `D:\Project\TestProject\xiyi` 为后续开发目录。原目录 `D:\Project\洗衣程序` 保留前期材料；进入开发阶段后，以本工作空间中的文档和脚本为维护入口，避免两处同时修改。

## 目录入口

- `AGENTS.md`：协作边界与工作要求。
- `docs/README.md`：全部文档的索引；文档统一放在 `docs/` 下，按分类分目录存放。
- `docs/01-需求与来源材料/`：需求说明书、业务简报、对话归档、开发准备大纲。
- `docs/02-开发文档/`：业务边界、流程推演、数据模型、开发环境。
- `docs/03-ADR/`：重要技术决定。
- `docs/04-组件说明/`：数据库脚本与展示原型的说明文档。
- `database/mysql/V001__create_core_tables.sql`：七张核心表的建表脚本。
- `laundry-prototype/dist/index.html`：双端展示原型；使用浏览器演示数据。
- `pom.xml`、`src/`：用户已有Java 17 Maven项目骨架，目前尚未接入Spring Boot或数据库。

已迁入脚本、文档、原型和主要来源材料，没有覆盖原有工程文件。2026-11-19已创建xiyi_dev开发库和七张表，验证后均为空；详情见docs/04-组件说明/database-mysql/execution-2026-11-19.md。
