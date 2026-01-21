import { compare } from 'bcrypt'
import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      message: '用户名和密码不能为空',
    })
  }

  try {
    const db = useDatabase()
    const { rows } =
      await db.sql`SELECT id, nickname, username, password, avatar FROM users WHERE username = ${username}`

    if (rows.length === 0) {
      throw createError({
        statusCode: 401,
        message: '用户名或密码错误',
      })
    }

    const user = rows[0]
    const isValid = await compare(password, user.password as string)
    if (!isValid) {
      throw createError({
        statusCode: 401,
        message: '用户名或密码错误',
      })
    }

    // 生成双 Token
    const accessToken = generateAccessToken(user.id as number)
    const refreshToken = await generateRefreshToken(user.id as number)

    return {
      accessToken,
      refreshToken,
      token: accessToken, // 兼容旧版本前端
      id: user.id,
      nickname: user.nickname,
      username: user.username,
      avatar: user.avatar,
    }
  } catch (error: any) {
    if (error.statusCode === 401) {
      throw error
    }
    console.error('登录失败:', error)
    throw createError({
      statusCode: 500,
      message: '登录失败',
    })
  }
})
