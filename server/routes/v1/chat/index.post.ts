import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const body = await readBody(event)

  const { title, type = 'private', participantId, memberIds } = body

  if (!title) {
    throw createError({
      statusCode: 400,
      message: '聊天标题不能为空',
    })
  }

  const db = useDatabase()

  try {
    if (type === 'private') {
      // 私聊：必须指定好友
      if (!participantId) {
        throw createError({
          statusCode: 400,
          message: '私聊必须指定聊天对象',
        })
      }

      // 验证是否为好友
      const { rows: friendRows } = await db.sql`
        SELECT id FROM friends
        WHERE userId = ${userId} AND friendId = ${participantId} AND status = 'accepted'
      `

      if (friendRows.length === 0) {
        throw createError({
          statusCode: 403,
          message: '只能与好友私聊',
        })
      }

      // 检查是否已存在与该好友的私聊
      const { rows: existingChats } = await db.sql`
        SELECT id FROM chats
        WHERE type = 'private'
          AND ((userId = ${userId} AND participantId = ${participantId})
            OR (userId = ${participantId} AND participantId = ${userId}))
      `

      if (existingChats.length > 0) {
        // 返回已存在的私聊（包含对方头像和昵称）
        const { rows } = await db.sql`
          SELECT c.id, c.userId, c.participantId, c.title, c.type, c.createdAt,
            u.avatar AS displayAvatar,
            COALESCE(u.nickname, u.username) AS displayName
          FROM chats c
          LEFT JOIN users u ON u.id = ${participantId}
          WHERE c.id = ${(existingChats[0] as any).id}
        `
        return rows[0]
      }

      // 创建私聊
      const result = await db.sql`
        INSERT INTO chats (userId, title, participantId, type)
        VALUES (${userId}, ${title}, ${participantId}, 'private')
      `

      const chatId = (result as any).insertId || result.lastInsertRowid

      // 添加成员到 chat_members
      await db.sql`
        INSERT INTO chat_members (chatId, userId, role) VALUES (${chatId}, ${userId}, 'owner')
      `
      await db.sql`
        INSERT INTO chat_members (chatId, userId, role) VALUES (${chatId}, ${participantId}, 'member')
      `

      // 返回新创建的私聊（包含对方头像和昵称）
      const { rows } = await db.sql`
        SELECT c.id, c.userId, c.participantId, c.title, c.type, c.createdAt,
          u.avatar AS displayAvatar,
          COALESCE(u.nickname, u.username) AS displayName
        FROM chats c
        LEFT JOIN users u ON u.id = ${participantId}
        WHERE c.id = ${chatId}
      `

      return rows[0]
    } else {
      // 群聊：可以拉任何用户
      const members = memberIds || []

      // 创建群聊
      const result = await db.sql`
        INSERT INTO chats (userId, title, type)
        VALUES (${userId}, ${title}, 'group')
      `

      const chatId = (result as any).insertId || result.lastInsertRowid

      // 添加创建者为 owner
      await db.sql`
        INSERT INTO chat_members (chatId, userId, role) VALUES (${chatId}, ${userId}, 'owner')
      `

      // 添加其他成员
      for (const memberId of members) {
        if (memberId !== userId) {
          await db.sql`
            INSERT INTO chat_members (chatId, userId, role)
            VALUES (${chatId}, ${memberId}, 'member')
            ON DUPLICATE KEY UPDATE role = role
          `
        }
      }

      const { rows } = await db.sql`
        SELECT id, userId, title, type, createdAt
        FROM chats WHERE id = ${chatId}
      `

      return rows[0]
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('创建聊天失败:', error)
    throw createError({
      statusCode: 500,
      message: '创建聊天失败',
    })
  }
})
