import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const chatId = Number(event.context.params?.id)
  const body = await readBody(event)

  const { memberIds } = body

  if (!chatId) {
    throw createError({
      statusCode: 400,
      message: '聊天ID不能为空',
    })
  }

  if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    throw createError({
      statusCode: 400,
      message: '请选择要添加的成员',
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
      message: '私聊不能添加成员',
    })
  }

  // 检查用户是否为群成员
  const { rows: memberCheck } = await db.sql`
    SELECT id FROM chat_members
    WHERE chatId = ${chatId} AND userId = ${userId}
  `

  if (memberCheck.length === 0) {
    throw createError({
      statusCode: 403,
      message: '您不是该群的成员',
    })
  }

  // 获取当前用户的好友列表
  const { rows: friends } = await db.sql`
    SELECT friendId FROM friends
    WHERE userId = ${userId} AND status = 'accepted'
  `
  const friendIds = new Set((friends as any[]).map((f) => f.friendId))

  // 只能添加自己的好友
  const addedMembers = []
  const skippedMembers = []
  for (const memberId of memberIds) {
    if (!friendIds.has(memberId)) {
      skippedMembers.push(memberId)
      continue
    }
    try {
      await db.sql`
        INSERT INTO chat_members (chatId, userId, role)
        VALUES (${chatId}, ${memberId}, 'member')
        ON DUPLICATE KEY UPDATE role = role
      `
      addedMembers.push(memberId)
    } catch (error) {
      console.error(`添加成员 ${memberId} 失败:`, error)
    }
  }

  return {
    success: true,
    addedCount: addedMembers.length,
    addedMembers,
    skippedCount: skippedMembers.length,
    skippedMembers,
    message:
      skippedMembers.length > 0 ? '部分用户不是您的好友，已跳过' : undefined,
  }
})
