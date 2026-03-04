import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const body = await readBody(event)
  const { nickname } = body

  if (!nickname?.trim()) {
    throw createError({
      statusCode: 400,
      message: '昵称不能为空',
    })
  }

  const db = useDatabase()

  await db.sql`
    UPDATE users SET nickname = ${nickname.trim()} WHERE id = ${userId}
  `

  return { success: true, nickname: nickname.trim() }
})
