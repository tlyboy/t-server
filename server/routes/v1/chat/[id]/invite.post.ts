import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const chatId = Number(event.context.params?.id)
  const body = await readBody(event)

  const { inviteeIds } = body

  if (!chatId) {
    throw createError({
      statusCode: 400,
      message: '聊天ID不能为空',
    })
  }

  if (!inviteeIds || !Array.isArray(inviteeIds) || inviteeIds.length === 0) {
    throw createError({
      statusCode: 400,
      message: '请选择要邀请的好友',
    })
  }

  const db = useDatabase()

  // 检查聊天是否存在
  const { rows: chatRows } = await db.sql`
    SELECT id, type, userId AS ownerId, title FROM chats WHERE id = ${chatId}
  `

  if (chatRows.length === 0) {
    throw createError({
      statusCode: 404,
      message: '聊天不存在',
    })
  }

  let chat = chatRows[0] as any
  let newOwnerId = chat.ownerId

  // 如果是私聊，转换为群聊
  if (chat.type === 'private') {
    // 将私聊转换为群聊
    await db.sql`
      UPDATE chats
      SET type = 'group', participantId = NULL, userId = ${userId}
      WHERE id = ${chatId}
    `

    // 将邀请人设为群主
    await db.sql`
      UPDATE chat_members
      SET role = 'owner'
      WHERE chatId = ${chatId} AND userId = ${userId}
    `

    // 将原来的群主（如果不是邀请人）降级为普通成员
    if (chat.ownerId !== userId) {
      await db.sql`
        UPDATE chat_members
        SET role = 'member'
        WHERE chatId = ${chatId} AND userId = ${chat.ownerId}
      `
    }

    newOwnerId = userId
    chat.type = 'group'
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

  // 获取已经是群成员的用户
  const { rows: existingMembers } = await db.sql`
    SELECT userId FROM chat_members WHERE chatId = ${chatId}
  `
  const existingMemberIds = new Set(
    (existingMembers as any[]).map((m) => m.userId),
  )

  // 获取已有待处理邀请的用户
  const { rows: pendingInvites } = await db.sql`
    SELECT inviteeId FROM chat_invites
    WHERE chatId = ${chatId} AND status = 'pending'
  `
  const pendingInviteIds = new Set(
    (pendingInvites as any[]).map((i) => i.inviteeId),
  )

  // 获取邀请人信息
  const { rows: inviterRows } = await db.sql`
    SELECT id, username, nickname, avatar FROM users WHERE id = ${userId}
  `
  const inviter = inviterRows[0] as any

  const invitedUsers = []
  const skippedUsers = []
  const createdInvites = []

  for (const inviteeId of inviteeIds) {
    // 跳过非好友
    if (!friendIds.has(inviteeId)) {
      skippedUsers.push({ id: inviteeId, reason: '不是您的好友' })
      continue
    }
    // 跳过已是群成员
    if (existingMemberIds.has(inviteeId)) {
      skippedUsers.push({ id: inviteeId, reason: '已是群成员' })
      continue
    }
    // 跳过已有待处理邀请
    if (pendingInviteIds.has(inviteeId)) {
      skippedUsers.push({ id: inviteeId, reason: '已有待处理邀请' })
      continue
    }

    try {
      // 获取被邀请人信息
      const { rows: inviteeRows } = await db.sql`
        SELECT id, username, nickname, avatar FROM users WHERE id = ${inviteeId}
      `
      const invitee = inviteeRows[0] as any

      // 创建邀请记录
      const { rows: insertResult } = await db.sql`
        INSERT INTO chat_invites (chatId, inviterId, inviteeId, status)
        VALUES (${chatId}, ${userId}, ${inviteeId}, 'pending')
      `

      // 获取插入的邀请 ID
      const { rows: lastIdRows } = await db.sql`SELECT LAST_INSERT_ID() as id`
      const inviteId = (lastIdRows[0] as any).id

      invitedUsers.push(inviteeId)
      createdInvites.push({
        id: inviteId,
        chatId,
        inviterId: userId,
        inviteeId,
        inviterUsername: inviter.username,
        inviterNickname: inviter.nickname,
        inviterAvatar: inviter.avatar,
        inviteeUsername: invitee.username,
        inviteeNickname: invitee.nickname,
        inviteeAvatar: invitee.avatar,
      })
    } catch (error) {
      console.error(`邀请用户 ${inviteeId} 失败:`, error)
      skippedUsers.push({ id: inviteeId, reason: '系统错误' })
    }
  }

  // WebSocket 通知群主有新的入群申请
  if (createdInvites.length > 0 && newOwnerId !== userId) {
    for (const invite of createdInvites) {
      wsManager.sendToUser(newOwnerId, {
        type: 'chat:invite',
        payload: {
          chatId,
          chatTitle: chat.title,
          invite,
        },
      })
    }
  }

  return {
    success: true,
    invitedCount: invitedUsers.length,
    invitedUsers,
    skippedCount: skippedUsers.length,
    skippedUsers,
    message:
      invitedUsers.length > 0
        ? '邀请已发送，等待群主审核'
        : '没有成功发送任何邀请',
    // 返回是否发生了私聊转群聊
    convertedToGroup: chat.type === 'group' && chatRows[0].type === 'private',
  }
})
