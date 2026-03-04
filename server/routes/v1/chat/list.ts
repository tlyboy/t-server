import { decryptMessage } from '~/utils/crypto'

import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId

  const db = useDatabase()

  // 获取用户参与的聊天列表（通过 chat_members 表）
  // 私聊：获取对方的头像和昵称
  // 群聊：使用群头像
  const { rows } = await db.sql`
    SELECT
      c.id,
      c.userId AS ownerId,
      c.title,
      c.type,
      c.avatar,
      c.createdAt,
      c.updatedAt,
      cm.role AS myRole,
      m.content AS lastMessage,
      m.encrypted AS lastMessageEncrypted,
      m.createdAt AS lastMessageAt,
      mu.nickname AS lastMessageUser,
      CASE
        WHEN c.type = 'private' THEN cm2.userId
        ELSE NULL
      END AS participantId,
      CASE
        WHEN c.type = 'private' THEN other_user.avatar
        ELSE c.avatar
      END AS displayAvatar,
      CASE
        WHEN c.type = 'private' THEN COALESCE(other_user.nickname, other_user.username)
        ELSE c.title
      END AS displayName
    FROM chats c
    INNER JOIN chat_members cm ON c.id = cm.chatId AND cm.userId = ${userId}
    LEFT JOIN messages m ON c.messageId = m.id
    LEFT JOIN users mu ON m.userId = mu.id
    LEFT JOIN chat_members cm2 ON c.id = cm2.chatId AND cm2.userId != ${userId} AND c.type = 'private'
    LEFT JOIN users other_user ON cm2.userId = other_user.id
    WHERE cm.userId = ${userId}
    ORDER BY COALESCE(m.createdAt, c.createdAt) DESC
  `

  // 解密加密的最后消息
  const decryptedRows = await Promise.all(
    (rows as any[]).map(async (chat) => {
      if (chat.lastMessage && chat.lastMessageEncrypted) {
        try {
          chat.lastMessage = await decryptMessage(chat.lastMessage, chat.id)
        } catch (error) {
          console.error(`解密聊天 ${chat.id} 最后消息失败:`, error)
          chat.lastMessage = '[消息解密失败]'
        }
      }
      // 不返回 lastMessageEncrypted 字段
      const { lastMessageEncrypted, ...rest } = chat
      return rest
    })
  )

  return decryptedRows
})
