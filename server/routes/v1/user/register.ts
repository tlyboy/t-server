import { hash } from 'bcrypt'

import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { nickname, username, password } = body

  if (!nickname || !username || !password) {
    throw createError({
      statusCode: 400,
      message: '用户名和密码不能为空',
    })
  }

  try {
    const db = useDatabase()

    // 检查用户名是否已存在
    const existingUser =
      await db.sql`SELECT id FROM users WHERE username = ${username}`
    if (existingUser.rows.length > 0) {
      throw createError({
        statusCode: 400,
        message: '用户名已存在',
      })
    }

    const hashedPassword = await hash(password, 10)
    await db.sql`INSERT INTO users (nickname, username, password) VALUES (${nickname}, ${username}, ${hashedPassword})`

    return {
      success: true,
      message: '注册成功',
    }
  } catch (error: any) {
    if (error.statusCode === 400) {
      throw error
    }
    console.error('注册失败:', error)
    throw createError({
      statusCode: 500,
      message: '注册失败',
    })
  }
})
