import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { refreshToken } = body

  if (!refreshToken) {
    throw createError({
      statusCode: 400,
      message: '缺少 refreshToken',
    })
  }

  // 验证 Refresh Token
  const decoded = await verifyRefreshToken(refreshToken)
  if (!decoded) {
    throw createError({
      statusCode: 401,
      statusMessage: 'REFRESH_TOKEN_INVALID',
      message: 'Refresh Token 无效或已过期，请重新登录',
    })
  }

  // 获取用户信息
  const db = useDatabase()
  const { rows } = await db.sql`
    SELECT id, nickname, username, avatar
    FROM users WHERE id = ${decoded.userId}
  `

  if (rows.length === 0) {
    throw createError({
      statusCode: 401,
      message: '用户不存在',
    })
  }

  const user = rows[0]

  // 生成新的 Access Token
  const accessToken = generateAccessToken(user.id as number)

  return {
    accessToken,
    token: accessToken, // 兼容旧版本
    id: user.id,
    nickname: user.nickname,
    username: user.username,
    avatar: user.avatar,
  }
})
