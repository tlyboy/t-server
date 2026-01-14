import { existsSync, unlinkSync } from 'fs'
import { join } from 'path'
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

  const db = useDatabase()

  // 获取文件信息
  const { rows } = await db.sql`
    SELECT id, filename FROM files WHERE id = ${id}
  `

  if (rows.length === 0) {
    throw createError({
      statusCode: 404,
      message: '文件不存在',
    })
  }

  const file = rows[0] as { id: number; filename: string }
  const filePath = join(process.cwd(), 'public', 'files', file.filename)

  // 从数据库删除
  await db.sql`DELETE FROM files WHERE id = ${id}`

  // 广播删除事件
  wsManager.broadcastToAllPeers({
    type: 'file:deleted',
    payload: { id: file.id },
  })

  // 删除物理文件
  if (existsSync(filePath)) {
    try {
      unlinkSync(filePath)
    } catch (err) {
      console.error('删除文件失败:', err)
    }
  }

  return { success: true }
})
