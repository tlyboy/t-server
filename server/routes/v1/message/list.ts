import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as {
    chatId: number
    limit?: number
    offset?: number
  }

  const { chatId, limit = 50, offset = 0 } = query

  if (!chatId) {
    throw createError({
      statusCode: 400,
      message: '聊天ID不能为空',
    })
  }

  const db = useDatabase()

  // 获取消息列表，包含发送者信息和加密状态
  const { rows } = await db.sql`
    SELECT
      m.id,
      m.chatId,
      m.userId,
      m.content,
      m.role,
      m.encrypted,
      m.createdAt,
      u.username,
      u.nickname,
      u.avatar
    FROM messages m
    JOIN users u ON m.userId = u.id
    WHERE m.chatId = ${chatId}
    ORDER BY m.createdAt ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `

  // 解密加密的消息
  const decryptedRows = await Promise.all(
    (rows as any[]).map(async (msg) => {
      if (msg.encrypted) {
        try {
          msg.content = await decryptMessage(msg.content, msg.chatId)
        } catch (error) {
          console.error(`解密消息 ${msg.id} 失败:`, error)
          msg.content = '[消息解密失败]'
        }
      }
      // 不返回 encrypted 字段给客户端
      const { encrypted, ...rest } = msg
      return rest
    }),
  )

  return decryptedRows
})
