import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const chatId = Number(event.context.params?.id)
  const inviteId = Number(event.context.params?.inviteId)
  const body = await readBody(event)

  const { action } = body

  if (!chatId || !inviteId) {
    throw createError({
      statusCode: 400,
      message: '参数不完整',
    })
  }

  if (!action || !['accept', 'reject'].includes(action)) {
    throw createError({
      statusCode: 400,
      message: 'action 必须是 accept 或 reject',
    })
  }

  const db = useDatabase()

  // 检查用户是否为群主
  const { rows: memberCheck } = await db.sql`
    SELECT role FROM chat_members
    WHERE chatId = ${chatId} AND userId = ${userId}
  `

  if (memberCheck.length === 0) {
    throw createError({
      statusCode: 403,
      message: '您不是该群的成员',
    })
  }

  const member = memberCheck[0] as any
  if (member.role !== 'owner') {
    throw createError({
      statusCode: 403,
      message: '只有群主可以审核邀请',
    })
  }

  // 获取邀请信息
  const { rows: inviteRows } = await db.sql`
    SELECT id, chatId, inviterId, inviteeId, status
    FROM chat_invites
    WHERE id = ${inviteId} AND chatId = ${chatId}
  `

  if (inviteRows.length === 0) {
    throw createError({
      statusCode: 404,
      message: '邀请不存在',
    })
  }

  const invite = inviteRows[0] as any
  if (invite.status !== 'pending') {
    throw createError({
      statusCode: 400,
      message: '该邀请已被处理',
    })
  }

  // 获取群聊信息
  const { rows: chatRows } = await db.sql`
    SELECT id, title FROM chats WHERE id = ${chatId}
  `
  const chat = chatRows[0] as any

  const newStatus = action === 'accept' ? 'accepted' : 'rejected'

  // 更新邀请状态
  await db.sql`
    UPDATE chat_invites
    SET status = ${newStatus}, processedAt = NOW()
    WHERE id = ${inviteId}
  `

  // 如果同意，添加成员到群聊
  if (action === 'accept') {
    await db.sql`
      INSERT INTO chat_members (chatId, userId, role)
      VALUES (${chatId}, ${invite.inviteeId}, 'member')
      ON DUPLICATE KEY UPDATE role = role
    `
  }

  // WebSocket 通知邀请人和被邀请人
  const notification = {
    type: 'chat:invite:result',
    payload: {
      chatId,
      chatTitle: chat.title,
      inviteId,
      action,
      inviterId: invite.inviterId,
      inviteeId: invite.inviteeId,
    },
  }

  // 通知邀请人
  wsManager.sendToUser(invite.inviterId, notification)

  // 通知被邀请人
  wsManager.sendToUser(invite.inviteeId, notification)

  return {
    success: true,
    action,
    message: action === 'accept' ? '已同意邀请，成员已加入群聊' : '已拒绝邀请',
  }
})
