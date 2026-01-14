import { wsManager } from '~/utils/ws-manager'

import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: '文件 ID 不能为空',
    })
  }

  const body = await readBody(event)
  const { x, y } = body

  if (typeof x !== 'number' || typeof y !== 'number') {
    throw createError({
      statusCode: 400,
      message: '位置参数无效',
    })
  }

  if (x < 0 || x > 100 || y < 0 || y > 100) {
    throw createError({
      statusCode: 400,
      message: '位置超出范围',
    })
  }

  const db = useDatabase()

  // 检查文件是否存在
  const { rows } = await db.sql`
    SELECT id FROM files WHERE id = ${id}
  `

  if (rows.length === 0) {
    throw createError({
      statusCode: 404,
      message: '文件不存在',
    })
  }

  // 更新位置
  await db.sql`
    UPDATE files SET x = ${x}, y = ${y} WHERE id = ${id}
  `

  // 广播位置更新
  wsManager.broadcastToAllPeers({
    type: 'file:moved',
    payload: { id: Number(id), x, y },
  })

  return { success: true }
})
