import { createReadStream, existsSync, statSync } from 'fs'
import { join, extname } from 'path'
import { sendStream, setResponseHeader, createError } from 'h3'

// MIME 类型映射
const mimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.zip': 'application/zip',
}

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path')

  if (!path) {
    throw createError({ statusCode: 400, message: 'Missing path' })
  }

  // 防止路径遍历攻击
  if (path.includes('..')) {
    throw createError({ statusCode: 400, message: 'Invalid path' })
  }

  // 构建文件路径
  const filePath = join(process.cwd(), 'public', 'uploads', path)

  // 检查文件是否存在
  if (!existsSync(filePath)) {
    throw createError({ statusCode: 404, message: 'File not found' })
  }

  // 获取文件信息
  const stat = statSync(filePath)
  if (!stat.isFile()) {
    throw createError({ statusCode: 404, message: 'File not found' })
  }

  // 设置响应头
  const ext = extname(filePath).toLowerCase()
  const mimeType = mimeTypes[ext] || 'application/octet-stream'

  setResponseHeader(event, 'Content-Type', mimeType)
  setResponseHeader(event, 'Content-Length', stat.size)
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000')

  // 返回文件流
  return sendStream(event, createReadStream(filePath))
})
