//https://nitro.unjs.io/config
export default defineNitroConfig({
  srcDir: 'server',
  compatibilityDate: '2025-06-13',
  runtimeConfig: {
    jwtSecret: '',
    encryptionKey: '', // 32字节 Base64 编码的消息加密主密钥
    // MySQL 数据库配置
    mysqlHost: '',
    mysqlPort: '',
    mysqlUser: '',
    mysqlPassword: '',
    mysqlDatabase: '',
  },
  experimental: {
    websocket: true,
  },
  serveStatic: true,
})
