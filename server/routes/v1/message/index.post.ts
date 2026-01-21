import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const body = await readBody(event)

  const { chatId, content } = body

  if (!chatId) {
    throw createError({
      statusCode: 400,
      message: '聊天ID不能为空',
    })
  }

  if (!content || !content.trim()) {
    throw createError({
      statusCode: 400,
      message: '消息内容不能为空',
    })
  }

  const db = useDatabase()

  try {
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

    // 加密消息内容
    const encryptedContent = await encryptMessage(content, chatId)

    // 插入加密后的消息
    const result = await db.sql`
      INSERT INTO messages (chatId, userId, content, role, encrypted)
      VALUES (${chatId}, ${userId}, ${encryptedContent}, 'user', 1)
    `

    // MySQL 使用 insertId，SQLite 使用 lastInsertRowid
    const messageId = (result as any).insertId || result.lastInsertRowid

    // 获取完整的消息信息（包含发送者信息）
    const { rows } = await db.sql`
      SELECT
        m.id, m.chatId, m.userId, m.role, m.createdAt,
        u.username, u.nickname, u.avatar
      FROM messages m
      JOIN users u ON m.userId = u.id
      WHERE m.id = ${messageId}
    `

    // 返回时使用原始明文内容（TLS 保护传输，数据库存储的是密文）
    const message = { ...rows[0], content }

    // 更新聊天的最后消息ID
    await db.sql`
      UPDATE chats
      SET messageId = ${messageId}
      WHERE id = ${chatId}
    `

    // 从 chat_members 获取所有成员，广播消息
    const { rows: members } = await db.sql`
      SELECT userId FROM chat_members WHERE chatId = ${chatId}
    `
    const recipientIds = (members as any[])
      .map((m) => m.userId)
      .filter((id) => id !== userId)

    // 广播给其他参与者（不包括发送者自己）
    if (recipientIds.length > 0) {
      wsManager.broadcastToUsers(recipientIds, {
        type: 'message:new',
        payload: {
          chatId,
          message,
        },
      })
    }

    return message
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('发送消息失败:', error)
    throw createError({
      statusCode: 500,
      message: '发送消息失败',
    })
  }
})
