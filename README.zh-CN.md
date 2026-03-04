# t-server

🌐 T-Server

## 安装

```bash
git clone https://github.com/tlyboy/t-server.git
```

## 使用说明

复制 `.env.example` 为 `.env` 并配置：

```sh
NITRO_JWT_SECRET=
NITRO_ENCRYPTION_KEY=

# MySQL 数据库配置
NITRO_MYSQL_HOST=
NITRO_MYSQL_PORT=
NITRO_MYSQL_USER=
NITRO_MYSQL_PASSWORD=
NITRO_MYSQL_DATABASE=
```

```bash
pnpm install
pnpm dev
pnpm build
```

## 使用许可

[MIT](https://opensource.org/licenses/MIT) © Guany
