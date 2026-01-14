import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const db = useDatabase()

  try {
    // 获取收到的好友申请（别人发给我的）
    const { rows } = await db.sql`
      SELECT
        f.id,
        f.userId,
        f.status,
        f.createdAt,
        u.username,
        u.nickname
      FROM friends f
      JOIN users u ON f.userId = u.id
      WHERE f.friendId = ${userId} AND f.status = 'pending'
      ORDER BY f.createdAt DESC
    `

    return rows
  } catch (error) {
    console.error('获取好友申请失败:', error)
    throw createError({
      statusCode: 500,
      message: '获取好友申请失败',
    })
  }
})
