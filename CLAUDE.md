# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

t Server 是一个基于 [Nitro](https://nitro.unjs.io/) 框架构建的即时通讯后端服务，使用 MySQL 作为数据库，支持 WebSocket 实时通信。

## 常用命令

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview

# 准备 Nitro 类型
pnpm prepare
```

## 环境配置

复制 `.env.example` 为 `.env` 并配置以下环境变量：

- `NITRO_JWT_SECRET` - JWT 密钥
- `MYSQL_USER/PASSWORD/DATABASE/HOST/PORT` - MySQL 数据库连接

## 代码架构

```
server/
├── middleware/     # 中间件（CORS、JWT 认证）
├── routes/         # API 路由（基于文件系统）
│   ├── _ws.ts      # WebSocket 处理器
│   └── v1/         # v1 版本 API
│       ├── user/   # 用户相关（登录、注册）
│       ├── chat/   # 聊天会话
│       └── message/# 消息
└── utils/          # 工具函数（JWT 生成/验证）
```

### 关键架构要点

- **路由系统**：Nitro 文件系统路由，`server/routes/` 下的文件自动映射为 API 端点
- **中间件执行顺序**：`server/middleware/` 下的中间件按文件名顺序执行（cors → auth）
- **认证机制**：JWT Bearer Token，白名单路由（`/`、`/v1/user/login`、`/v1/user/register`）无需认证
- **认证信息访问**：通过 `event.context.auth.userId` 获取当前用户 ID
- **数据库访问**：使用 Nitro 实验性 database 功能，通过 `useDatabase()` 获取连接，支持 SQL 模板字符串
- **WebSocket**：通过 `_ws.ts` 文件定义 WebSocket 处理器（实验性功能）

## 技术要求

- Node.js >= 22
- pnpm 10.22.0（通过 corepack 启用）
