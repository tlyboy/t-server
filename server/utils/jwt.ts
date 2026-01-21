import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { useDatabase } from './db'

const JWT_SECRET = useRuntimeConfig().jwtSecret
const ACCESS_TOKEN_EXPIRES_IN = '15m'
const REFRESH_TOKEN_EXPIRES_IN = 30 // 天

// 生成 Access Token（短期，15分钟）
export const generateAccessToken = (userId: number): string => {
  return jwt.sign({ userId, type: 'access' }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  })
}

// 生成 Refresh Token（长期，7天，存储到数据库）
export const generateRefreshToken = async (userId: number): Promise<string> => {
  const token = crypto.randomBytes(64).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN)

  const db = useDatabase()
  await db.sql`
    INSERT INTO refresh_tokens (userId, token, expiresAt)
    VALUES (${userId}, ${token}, ${expiresAt.toISOString().slice(0, 19).replace('T', ' ')})
  `

  return token
}

// 验证 Access Token
export const verifyAccessToken = (token: string): { userId: number } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; type?: string }
    // 兼容旧 token（没有 type 字段）和新 token
    if (decoded.type && decoded.type !== 'access') return null
    return { userId: decoded.userId }
  } catch {
    return null
  }
}

// 验证 Refresh Token
export const verifyRefreshToken = async (
  token: string
): Promise<{ userId: number } | null> => {
  const db = useDatabase()
  const { rows } = await db.sql`
    SELECT userId, expiresAt, revokedAt
    FROM refresh_tokens
    WHERE token = ${token}
  `

  if (rows.length === 0) return null

  const record = rows[0] as { userId: number; expiresAt: Date; revokedAt: Date | null }

  // 检查是否被吊销
  if (record.revokedAt) return null

  // 检查是否过期
  if (new Date(record.expiresAt) < new Date()) return null

  return { userId: record.userId }
}

// 吊销单个 Refresh Token
export const revokeRefreshToken = async (token: string): Promise<void> => {
  const db = useDatabase()
  await db.sql`
    UPDATE refresh_tokens
    SET revokedAt = NOW()
    WHERE token = ${token}
  `
}

// 吊销用户的所有 Refresh Token（用于登出所有设备、密码修改等场景）
export const revokeAllRefreshTokens = async (userId: number): Promise<void> => {
  const db = useDatabase()
  await db.sql`
    UPDATE refresh_tokens
    SET revokedAt = NOW()
    WHERE userId = ${userId} AND revokedAt IS NULL
  `
}

// 兼容旧代码的别名
export const generateToken = generateAccessToken
export const verifyToken = verifyAccessToken
