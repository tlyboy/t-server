import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { pickupCode } = body

  if (!id) {
    throw createError({
      statusCode: 400,
      message: '文件 ID 不能为空',
    })
  }

  if (!pickupCode || !/^\d{6}$/.test(pickupCode)) {
    throw createError({
      statusCode: 400,
      message: '请输入有效的取件码',
    })
  }

  const db = useDatabase()

  const { rows } = await db.sql`
    SELECT id, pickupCode FROM files WHERE id = ${id}
  `

  if (rows.length === 0) {
    throw createError({
      statusCode: 404,
      message: '文件不存在',
    })
  }

  const file = rows[0] as { id: number; pickupCode: string | null }

  if (!file.pickupCode) {
    return { valid: true }
  }

  if (file.pickupCode !== pickupCode) {
    throw createError({
      statusCode: 403,
      message: '取件码错误',
    })
  }

  return { valid: true }
})
