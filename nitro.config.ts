//https://nitro.unjs.io/config
export default defineNitroConfig({
  srcDir: 'server',
  compatibilityDate: '2025-06-13',
  runtimeConfig: {
    jwtSecret: '',
    encryptionKey: '', // 32字节 Base64 编码的消息加密主密钥
  },
  experimental: {
    database: true,
    websocket: true,
  },
  serveStatic: true,
  database: {
    default: {
      connector: 'mysql2',
      options: {
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        // 连接池配置
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 3000, // 3秒后开始发送 TCP keep-alive
        // 空闲连接管理 - idleTimeout 必须小于 MySQL 的 wait_timeout
        // MySQL 默认 wait_timeout=28800秒(8小时)，但 Docker 环境可能更短
        maxIdle: 0, // 不保留空闲连接
        idleTimeout: 10000, // 10秒后关闭空闲连接（确保比 MySQL 更早关闭）
      },
    },
  },
})
