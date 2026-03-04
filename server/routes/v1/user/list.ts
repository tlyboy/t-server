import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const db = useDatabase()

  try {
    // 获取所有用户（排除当前用户，不返回密码）
    const { rows } = await db.sql`
      SELECT id, username, nickname, createdAt
      FROM users
      WHERE id != ${userId}
      ORDER BY createdAt DESC
    `

    return rows
  } catch (error) {
    console.error('获取用户列表失败:', error)
    throw createError({
      statusCode: 500,
      message: '获取用户列表失败',
    })
  }
})
