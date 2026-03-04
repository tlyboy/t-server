import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const body = await readBody(event)
  const { requestId } = body

  if (!requestId) {
    throw createError({
      statusCode: 400,
      message: '请求ID不能为空',
    })
  }

  const db = useDatabase()

  try {
    // 验证申请存在且是发给当前用户的
    const { rows: requests } = await db.sql`
      SELECT id, userId, friendId, status
      FROM friends
      WHERE id = ${requestId} AND friendId = ${userId} AND status = 'pending'
    `

    if (requests.length === 0) {
      throw createError({
        statusCode: 404,
        message: '好友申请不存在或已处理',
      })
    }

    const request = requests[0] as any

    // 更新申请状态为 accepted
    await db.sql`
      UPDATE friends SET status = 'accepted' WHERE id = ${requestId}
    `

    // 创建反向好友关系（实现双向好友）
    await db.sql`
      INSERT INTO friends (userId, friendId, status)
      VALUES (${userId}, ${request.userId}, 'accepted')
      ON DUPLICATE KEY UPDATE status = 'accepted'
    `

    // 获取当前用户信息用于通知
    const { rows: users } = await db.sql`
      SELECT id, username, nickname FROM users WHERE id = ${userId}
    `

    // 通过 WebSocket 通知申请人
    wsManager.sendToUser(request.userId, {
      type: 'friend:accepted',
      payload: {
        friend: users[0],
      },
    })

    return {
      success: true,
      message: '好友添加成功',
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('接受好友申请失败:', error)
    throw createError({
      statusCode: 500,
      message: '接受好友申请失败',
    })
  }
})
