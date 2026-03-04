import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const currentUserId = event.context.auth.userId
  const chatId = Number(event.context.params?.id)
  const targetUserId = Number(event.context.params?.userId)

  if (!chatId || !targetUserId) {
    throw createError({
      statusCode: 400,
      message: '参数不完整',
    })
  }

  const db = useDatabase()

  // 检查聊天是否存在且为群聊
  const { rows: chatRows } = await db.sql`
    SELECT id, type FROM chats WHERE id = ${chatId}
  `

  if (chatRows.length === 0) {
    throw createError({
      statusCode: 404,
      message: '聊天不存在',
    })
  }

  const chat = chatRows[0] as any
  if (chat.type !== 'group') {
    throw createError({
      statusCode: 400,
      message: '私聊不能移除成员',
    })
  }

  // 获取当前用户的角色
  const { rows: currentUserRole } = await db.sql`
    SELECT role FROM chat_members
    WHERE chatId = ${chatId} AND userId = ${currentUserId}
  `

  if (currentUserRole.length === 0) {
    throw createError({
      statusCode: 403,
      message: '您不是该群的成员',
    })
  }

  const myRole = (currentUserRole[0] as any).role

  // 获取目标用户的角色
  const { rows: targetUserRole } = await db.sql`
    SELECT role FROM chat_members
    WHERE chatId = ${chatId} AND userId = ${targetUserId}
  `

  if (targetUserRole.length === 0) {
    throw createError({
      statusCode: 404,
      message: '该用户不是群成员',
    })
  }

  const targetRole = (targetUserRole[0] as any).role

  // 权限检查
  if (currentUserId === targetUserId) {
    // 自己退出群聊
    if (targetRole === 'owner') {
      throw createError({
        statusCode: 400,
        message: '群主不能退出群聊，请先转让群主',
      })
    }
  } else {
    // 移除他人
    if (myRole === 'member') {
      throw createError({
        statusCode: 403,
        message: '普通成员不能移除他人',
      })
    }
    if (myRole === 'admin' && targetRole !== 'member') {
      throw createError({
        statusCode: 403,
        message: '管理员只能移除普通成员',
      })
    }
    if (targetRole === 'owner') {
      throw createError({
        statusCode: 403,
        message: '不能移除群主',
      })
    }
  }

  // 执行移除
  await db.sql`
    DELETE FROM chat_members
    WHERE chatId = ${chatId} AND userId = ${targetUserId}
  `

  return {
    success: true,
    message: currentUserId === targetUserId ? '已退出群聊' : '已移除成员',
  }
})
