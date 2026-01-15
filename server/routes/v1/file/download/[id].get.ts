import { createReadStream, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { wsManager } from '~/utils/ws-manager'

import { useDatabase } from '~/utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const query = getQuery(event)
  const code = query.code as string | undefined

  if (!id) {
    throw createError({
      statusCode: 400,
      message: '文件 ID 不能为空',
    })
  }

  const db = useDatabase()

  // 获取文件信息
  const { rows } = await db.sql`
    SELECT id, filename, originalName, mimeType, size, pickupCode
    FROM files WHERE id = ${id}
  `

  if (rows.length === 0) {
    throw createError({
      statusCode: 404,
      message: '文件不存在或已被下载',
    })
  }

  const file = rows[0] as {
    id: number
    filename: string
    originalName: string
    mimeType: string
    size: number
    pickupCode: string | null
  }

  // 验证取件码
  if (file.pickupCode) {
    if (!code) {
      throw createError({
        statusCode: 403,
        message: '此文件需要取件码',
      })
    }
    if (file.pickupCode !== code) {
      throw createError({
        statusCode: 403,
        message: '取件码错误',
      })
    }
  }

  const filePath = join(process.cwd(), 'public', 'files', file.filename)

  if (!existsSync(filePath)) {
    // 清理孤立的数据库记录
    await db.sql`DELETE FROM files WHERE id = ${id}`
    throw createError({
      statusCode: 404,
      message: '文件不存在或已被下载',
    })
  }

  // 先从数据库删除（防止竞态条件）
  await db.sql`DELETE FROM files WHERE id = ${id}`

  // 广播删除事件给所有客户端
  wsManager.broadcastToAllPeers({
    type: 'file:deleted',
    payload: { id: file.id },
  })

  // 设置响应头
  setResponseHeader(event, 'Content-Type', file.mimeType)
  setResponseHeader(event, 'Content-Length', file.size.toString())
  setResponseHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(file.originalName)}"`,
  )

  // 创建流并在发送完成后删除文件
  const stream = createReadStream(filePath)
  stream.on('close', () => {
    try {
      unlinkSync(filePath)
    } catch (err) {
      console.error('删除文件失败:', err)
    }
  })

  return sendStream(event, stream)
})
