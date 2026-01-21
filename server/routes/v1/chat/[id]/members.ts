import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const chatId = Number(event.context.params?.id)

  if (!chatId) {
    throw createError({
      statusCode: 400,
      message: '聊天ID不能为空',
    })
  }

  const db = useDatabase()

  // 检查用户是否为聊天成员
  const { rows: memberCheck } = await db.sql`
    SELECT id FROM chat_members
    WHERE chatId = ${chatId} AND userId = ${userId}
  `

  if (memberCheck.length === 0) {
    throw createError({
      statusCode: 403,
      message: '您不是该聊天的成员',
    })
  }

  // 获取群成员列表，包含用户信息和好友状态
  const { rows } = await db.sql`
    SELECT
      cm.userId,
      cm.role,
      cm.joinedAt,
      u.username,
      u.nickname,
      u.avatar,
      CASE WHEN f.id IS NOT NULL THEN TRUE ELSE FALSE END AS isFriend
    FROM chat_members cm
    JOIN users u ON cm.userId = u.id
    LEFT JOIN friends f ON f.userId = ${userId} AND f.friendId = cm.userId AND f.status = 'accepted'
    WHERE cm.chatId = ${chatId}
    ORDER BY
      CASE cm.role
        WHEN 'owner' THEN 1
        WHEN 'admin' THEN 2
        ELSE 3
      END,
      cm.joinedAt
  `

  return rows
})
