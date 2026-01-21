import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const messageId = getRouterParam(event, 'id')

  if (!messageId) {
    throw createError({
      statusCode: 400,
      message: '消息ID不能为空',
    })
  }

  const db = useDatabase()

  try {
    // 检查消息是否存在且属于当前用户
    const { rows: existing } = await db.sql`
      SELECT id FROM messages
      WHERE id = ${messageId} AND userId = ${userId}
    `

    if (existing.length === 0) {
      throw createError({
        statusCode: 404,
        message: '消息不存在或无权限删除',
      })
    }

    // 删除消息
    await db.sql`
      DELETE FROM messages
      WHERE id = ${messageId}
    `

    return {
      success: true,
      message: '消息已删除',
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('删除消息失败:', error)
    throw createError({
      statusCode: 500,
      message: '删除消息失败',
    })
  }
})
