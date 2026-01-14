import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const query = getQuery(event)
  const keyword = query.keyword as string

  if (!keyword || !keyword.trim()) {
    return []
  }

  const db = useDatabase()
  const searchKeyword = `%${keyword.trim()}%`

  try {
    // 搜索用户（排除自己）
    const { rows: users } = await db.sql`
      SELECT id, username, nickname, createdAt
      FROM users
      WHERE id != ${userId}
        AND (username LIKE ${searchKeyword} OR nickname LIKE ${searchKeyword})
      LIMIT 20
    `

    // 获取与这些用户的好友关系
    const userIds = users.map((u: any) => u.id)
    if (userIds.length === 0) {
      return []
    }

    // 查询已有的好友关系
    const { rows: friendships } = await db.sql`
      SELECT friendId, status, userId as senderId
      FROM friends
      WHERE (userId = ${userId} AND friendId IN (${userIds.join(',')}))
         OR (friendId = ${userId} AND userId IN (${userIds.join(',')}))
    `

    // 构建好友关系映射
    const relationMap = new Map<
      number,
      { isFriend: boolean; isPending: boolean; pendingType: string | null }
    >()

    for (const f of friendships as any[]) {
      const otherId = f.senderId === userId ? f.friendId : f.senderId

      if (f.status === 'accepted') {
        relationMap.set(otherId, {
          isFriend: true,
          isPending: false,
          pendingType: null,
        })
      } else if (f.status === 'pending') {
        const pendingType = f.senderId === userId ? 'sent' : 'received'
        relationMap.set(otherId, {
          isFriend: false,
          isPending: true,
          pendingType,
        })
      }
    }

    // 返回带关系状态的用户列表
    return users.map((user: any) => {
      const relation = relationMap.get(user.id) || {
        isFriend: false,
        isPending: false,
        pendingType: null,
      }
      return {
        ...user,
        ...relation,
      }
    })
  } catch (error) {
    console.error('搜索用户失败:', error)
    throw createError({
      statusCode: 500,
      message: '搜索用户失败',
    })
  }
})
