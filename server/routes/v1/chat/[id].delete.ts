import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const chatId = getRouterParam(event, 'id')

  if (!chatId) {
    throw createError({
      statusCode: 400,
      message: '聊天ID不能为空',
    })
  }

  const db = useDatabase()

  try {
    // 检查聊天是否存在且属于当前用户
    const { rows: existing } = await db.sql`
      SELECT id FROM chats
      WHERE id = ${chatId} AND userId = ${userId}
    `

    if (existing.length === 0) {
      throw createError({
        statusCode: 404,
        message: '聊天不存在或无权限',
      })
    }

    // 先删除聊天相关的所有消息
    await db.sql`
      DELETE FROM messages
      WHERE chatId = ${chatId}
    `

    // 删除聊天
    await db.sql`
      DELETE FROM chats
      WHERE id = ${chatId}
    `

    return {
      success: true,
      message: '聊天已删除',
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('删除聊天失败:', error)
    throw createError({
      statusCode: 500,
      message: '删除聊天失败',
    })
  }
})
