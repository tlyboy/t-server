import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const chatId = getRouterParam(event, 'id')
  const body = await readBody(event)

  const { title } = body

  if (!chatId) {
    throw createError({
      statusCode: 400,
      message: '聊天ID不能为空',
    })
  }

  if (!title) {
    throw createError({
      statusCode: 400,
      message: '聊天标题不能为空',
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

    // 更新聊天标题
    await db.sql`
      UPDATE chats
      SET title = ${title}
      WHERE id = ${chatId}
    `

    // 返回更新后的聊天信息
    const { rows } = await db.sql`
      SELECT id, userId, title, createdAt, updatedAt
      FROM chats
      WHERE id = ${chatId}
    `

    return rows[0]
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('更新聊天失败:', error)
    throw createError({
      statusCode: 500,
      message: '更新聊天失败',
    })
  }
})
