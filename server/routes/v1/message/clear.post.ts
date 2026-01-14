import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const body = await readBody(event)
  const { chatId } = body

  if (!chatId) {
    throw createError({
      statusCode: 400,
      message: '聊天ID不能为空',
    })
  }

  const db = useDatabase()

  try {
    // 验证用户是否有权限操作此聊天
    const { rows: chatRows } = await db.sql`
      SELECT id FROM chats
      WHERE id = ${chatId} AND (userId = ${userId} OR participantId = ${userId})
    `

    if (chatRows.length === 0) {
      throw createError({
        statusCode: 403,
        message: '无权操作此聊天',
      })
    }

    // 删除聊天的所有消息
    await db.sql`
      DELETE FROM messages WHERE chatId = ${chatId}
    `

    // 清空聊天的最后消息ID
    await db.sql`
      UPDATE chats SET messageId = NULL WHERE id = ${chatId}
    `

    return { success: true }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('清空消息失败:', error)
    throw createError({
      statusCode: 500,
      message: '清空消息失败',
    })
  }
})
