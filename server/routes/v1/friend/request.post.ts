import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const body = await readBody(event)
  const { friendId } = body

  if (!friendId) {
    throw createError({
      statusCode: 400,
      message: '请指定要添加的用户',
    })
  }

  if (friendId === userId) {
    throw createError({
      statusCode: 400,
      message: '不能添加自己为好友',
    })
  }

  const db = useDatabase()

  try {
    // 检查目标用户是否存在
    const { rows: targetUsers } = await db.sql`
      SELECT id, username, nickname FROM users WHERE id = ${friendId}
    `

    if (targetUsers.length === 0) {
      throw createError({
        statusCode: 404,
        message: '用户不存在',
      })
    }

    // 检查是否已经是好友或已发送申请
    const { rows: existing } = await db.sql`
      SELECT id, status, userId as senderId FROM friends
      WHERE (userId = ${userId} AND friendId = ${friendId})
         OR (userId = ${friendId} AND friendId = ${userId})
    `

    if (existing.length > 0) {
      const relation = existing[0] as any
      if (relation.status === 'accepted') {
        throw createError({
          statusCode: 400,
          message: '该用户已经是你的好友',
        })
      }
      if (relation.status === 'pending') {
        if (relation.senderId === userId) {
          throw createError({
            statusCode: 400,
            message: '已发送过好友申请，请等待对方确认',
          })
        } else {
          throw createError({
            statusCode: 400,
            message: '对方已向你发送好友申请，请到好友申请中确认',
          })
        }
      }
      if (relation.status === 'blocked') {
        throw createError({
          statusCode: 400,
          message: '无法添加该用户',
        })
      }
    }

    // 创建好友申请
    const result = await db.sql`
      INSERT INTO friends (userId, friendId, status)
      VALUES (${userId}, ${friendId}, 'pending')
    `

    const requestId = (result as any).insertId || result.lastInsertRowid

    // 获取当前用户信息
    const { rows: currentUsers } = await db.sql`
      SELECT id, username, nickname FROM users WHERE id = ${userId}
    `

    // 通过 WebSocket 通知目标用户
    wsManager.sendToUser(friendId, {
      type: 'friend:request',
      payload: {
        requestId,
        fromUser: currentUsers[0],
      },
    })

    return {
      id: requestId,
      userId,
      friendId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('发送好友申请失败:', error)
    throw createError({
      statusCode: 500,
      message: '发送好友申请失败',
    })
  }
})
