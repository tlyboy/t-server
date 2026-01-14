import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.auth.userId
  const body = await readBody(event)
  const { avatar } = body

  if (!avatar) {
    throw createError({
      statusCode: 400,
      message: '头像地址不能为空',
    })
  }

  const db = useDatabase()

  try {
    await db.sql`UPDATE users SET avatar = ${avatar} WHERE id = ${userId}`

    return {
      success: true,
      avatar,
    }
  } catch (error) {
    console.error('更新头像失败:', error)
    throw createError({
      statusCode: 500,
      message: '更新头像失败',
    })
  }
})
