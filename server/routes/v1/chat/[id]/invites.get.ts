import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const chatId = Number(event.context.params?.id)

  if (!chatId) {
    throw createError({
      statusCode: 400,
      message: '聊天ID不能为空',
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
      message: '只有群主可以查看邀请列表',
    })
  }

  // 获取待审核的邀请列表
  const { rows } = await db.sql`
    SELECT
      ci.id,
      ci.chatId,
      ci.inviterId,
      ci.inviteeId,
      ci.status,
      ci.createdAt,
      inviter.username AS inviterUsername,
      inviter.nickname AS inviterNickname,
      inviter.avatar AS inviterAvatar,
      invitee.username AS inviteeUsername,
      invitee.nickname AS inviteeNickname,
      invitee.avatar AS inviteeAvatar
    FROM chat_invites ci
    JOIN users inviter ON ci.inviterId = inviter.id
    JOIN users invitee ON ci.inviteeId = invitee.id
    WHERE ci.chatId = ${chatId} AND ci.status = 'pending'
    ORDER BY ci.createdAt DESC
  `

  return rows
})
