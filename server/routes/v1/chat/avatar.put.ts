import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const body = await readBody(event)
  const { chatId, avatar } = body

  if (!chatId) {
    throw createError({
      statusCode: 400,
      message: '缺少聊天 ID',
    })
  }

  const db = useDatabase()

  // 验证用户是否是该聊天的成员
  const { rows: members } = await db.sql`
    SELECT 1 FROM chat_members WHERE chatId = ${chatId} AND userId = ${userId}
  `

  if (members.length === 0) {
    throw createError({
      statusCode: 403,
      message: '无权修改该聊天',
    })
  }

  // 验证是否是群聊
  const { rows: chats } = await db.sql`
    SELECT type FROM chats WHERE id = ${chatId}
  `

  if (chats.length === 0) {
    throw createError({
      statusCode: 404,
      message: '聊天不存在',
    })
  }

  if (chats[0].type !== 'group') {
    throw createError({
      statusCode: 400,
      message: '只有群聊可以设置头像',
    })
  }

  // 更新群头像
  await db.sql`
    UPDATE chats SET avatar = ${avatar} WHERE id = ${chatId}
  `

  return { success: true, avatar }
})
