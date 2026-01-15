import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { wsManager } from '~/utils/ws-manager'
import { useDatabase } from '~/utils/db'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      message: '请选择要上传的文件',
    })
  }

  const file = formData.find((item) => item.name === 'file')
  const xField = formData.find((item) => item.name === 'x')
  const yField = formData.find((item) => item.name === 'y')
  const pickupCodeField = formData.find((item) => item.name === 'pickupCode')

  if (!file || !file.data || !file.filename) {
    throw createError({
      statusCode: 400,
      message: '文件不能为空',
    })
  }

  const x = parseFloat(xField?.data?.toString() || '50')
  const y = parseFloat(yField?.data?.toString() || '50')
  const pickupCode = pickupCodeField?.data?.toString() || null

  if (isNaN(x) || isNaN(y) || x < 0 || x > 100 || y < 0 || y > 100) {
    throw createError({
      statusCode: 400,
      message: '无效的位置参数',
    })
  }

  if (pickupCode && !/^\d{6}$/.test(pickupCode)) {
    throw createError({
      statusCode: 400,
      message: '取件码必须为6位数字',
    })
  }

  if (file.data.length > MAX_FILE_SIZE) {
    throw createError({
      statusCode: 400,
      message: `文件大小超过限制 (最大 ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
    })
  }

  // 生成唯一文件名
  const ext = extname(file.filename) || ''
  const filename = `${randomUUID()}${ext}`

  // 存储在 public/files 目录
  const uploadDir = join(process.cwd(), 'public', 'files')
  await mkdir(uploadDir, { recursive: true })

  const filePath = join(uploadDir, filename)
  await writeFile(filePath, file.data)

  const mimeType = file.type || 'application/octet-stream'

  // 插入数据库
  const db = useDatabase()
  const result = await db.sql`
    INSERT INTO files (filename, originalName, mimeType, size, x, y, pickupCode)
    VALUES (${filename}, ${file.filename}, ${mimeType}, ${file.data.length}, ${x}, ${y}, ${pickupCode})
  `

  const fileId = (result as any).insertId || (result as any).lastInsertRowid

  const newFile = {
    id: fileId,
    filename,
    originalName: file.filename,
    mimeType,
    size: file.data.length,
    x,
    y,
    hasPickupCode: !!pickupCode,
    createdAt: new Date().toISOString(),
  }

  // 广播给所有连接的客户端
  wsManager.broadcastToAllPeers({
    type: 'file:new',
    payload: newFile,
  })

  return newFile
})
