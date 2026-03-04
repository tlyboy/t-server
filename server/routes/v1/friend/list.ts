import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const db = useDatabase()

  try {
    // 获取好友列表（只获取已接受的好友关系）
    const { rows } = await db.sql`
      SELECT
        u.id,
        u.username,
        u.nickname,
        u.avatar,
        f.id as friendshipId,
        f.createdAt
      FROM friends f
      JOIN users u ON f.friendId = u.id
      WHERE f.userId = ${userId} AND f.status = 'accepted'
      ORDER BY u.nickname, u.username
    `

    // 添加在线状态
    const friends = (rows as any[]).map((friend) => ({
      ...friend,
      isOnline: wsManager.isUserOnline(friend.id),
    }))

    return friends
  } catch (error) {
    console.error('获取好友列表失败:', error)
    throw createError({
      statusCode: 500,
      message: '获取好友列表失败',
    })
  }
})
