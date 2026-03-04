import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const friendId = Number(event.context.params?.id)

  if (!friendId || isNaN(friendId)) {
    throw createError({
      statusCode: 400,
      message: '好友ID无效',
    })
  }

  const db = useDatabase()

  try {
    // 验证好友关系存在
    const { rows: existing } = await db.sql`
      SELECT id FROM friends
      WHERE userId = ${userId} AND friendId = ${friendId} AND status = 'accepted'
    `

    if (existing.length === 0) {
      throw createError({
        statusCode: 404,
        message: '好友关系不存在',
      })
    }

    // 删除双向好友关系
    await db.sql`
      DELETE FROM friends
      WHERE (userId = ${userId} AND friendId = ${friendId})
         OR (userId = ${friendId} AND friendId = ${userId})
    `

    // 通知对方被删除好友
    wsManager.sendToUser(friendId, {
      type: 'friend:removed',
      payload: {
        friendId: userId,
      },
    })

    return {
      success: true,
      message: '好友删除成功',
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('删除好友失败:', error)
    throw createError({
      statusCode: 500,
      message: '删除好友失败',
    })
  }
})
