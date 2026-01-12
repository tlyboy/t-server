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
        keepAliveInitialDelay: 10000,
        // 空闲连接管理 - 防止使用被 MySQL 服务器关闭的连接
        maxIdle: 0,
        idleTimeout: 60000,
        // 连接健康检查 - 每次获取连接前 ping 检测，自动替换已死亡的连接
        pingOnAcquire: true,
      },
    },
  },
})
