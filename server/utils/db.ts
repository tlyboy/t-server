import mysql from 'mysql2/promise'
import type { Pool, RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2/promise'

let pool: Pool | null = null

/**
 * 获取或创建 MySQL 连接池
 */
function getPool(): Pool {
  if (!pool) {
    const runtimeConfig = useRuntimeConfig()
    const config = {
      host: runtimeConfig.mysqlHost,
      port: Number(runtimeConfig.mysqlPort) || 3306,
      user: runtimeConfig.mysqlUser,
      password: runtimeConfig.mysqlPassword,
      database: runtimeConfig.mysqlDatabase,
      // 连接池配置
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 3000,
      // 空闲连接管理
      maxIdle: 0,
      idleTimeout: 10000,
    }

    console.log('[MySQL] 创建连接池，配置:', {
      host: config.host,
      port: config.port,
      user: config.user,
      database: config.database,
      hasPassword: !!config.password,
    })

    pool = mysql.createPool(config)

    // 监听连接错误，自动销毁有问题的连接
    pool.on('connection', (connection) => {
      connection.on('error', (err) => {
        console.error('[MySQL] 连接错误:', err.message)
        connection.destroy()
      })
    })

    console.log('[MySQL] 连接池已创建')
  }

  return pool
}

/**
 * SQL 模板字符串处理器
 */
async function sql(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<{ rows: any[]; insertId?: number }> {
  const pool = getPool()

  // 构建参数化查询
  let query = strings[0]
  const params: any[] = []

  for (let i = 0; i < values.length; i++) {
    query += '?' + strings[i + 1]
    params.push(values[i])
  }

  try {
    const [result] = await pool.execute(query, params)

    // 处理 INSERT/UPDATE/DELETE 结果
    if (
      'insertId' in (result as any) ||
      'affectedRows' in (result as any) ||
      'changedRows' in (result as any)
    ) {
      const okPacket = result as OkPacket
      return {
        rows: [],
        insertId: okPacket.insertId,
      }
    }

    // 处理 SELECT 结果
    return {
      rows: result as RowDataPacket[],
    }
  } catch (error: any) {
    console.error('[MySQL] 查询错误:', error.message)
    console.error('[MySQL] SQL:', query)
    console.error('[MySQL] 参数:', params)
    throw error
  }
}

/**
 * 兼容 Nitro useDatabase() API
 */
export function useDatabase() {
  return {
    sql,
  }
}

/**
 * 关闭连接池（用于优雅关闭）
 */
export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
    console.log('[MySQL] 连接池已关闭')
  }
}
