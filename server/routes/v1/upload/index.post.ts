import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'

// 图片/视频类型（用于判断 markdown 格式）
const MEDIA_TYPES = ['image/', 'video/']

// 文件大小限制
const MAX_MEDIA_SIZE = 50 * 1024 * 1024 // 50MB (图片/视频)
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB (其他文件)

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      message: '请选择要上传的文件',
    })
  }

  const file = formData.find((item) => item.name === 'file')

  if (!file || !file.data || !file.filename) {
    throw createError({
      statusCode: 400,
      message: '文件不能为空',
    })
  }

  const mimeType = file.type || 'application/octet-stream'
  const isMedia = MEDIA_TYPES.some((type) => mimeType.startsWith(type))

  // 验证文件大小
  const maxSize = isMedia ? MAX_MEDIA_SIZE : MAX_FILE_SIZE
  if (file.data.length > maxSize) {
    throw createError({
      statusCode: 400,
      message: `文件大小超过限制 (最大 ${maxSize / 1024 / 1024}MB)`,
    })
  }

  // 生成唯一文件名
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const ext = extname(file.filename) || ''
  const filename = `${randomUUID()}${ext}`
  const relativePath = `${year}/${month}`
  const fullRelativePath = `${relativePath}/${filename}`

  // 确保目录存在 (使用 public/uploads 目录，Nitro 会自动服务静态文件)
  const uploadDir = join(process.cwd(), 'public', 'uploads', relativePath)
  await mkdir(uploadDir, { recursive: true })

  // 保存文件
  const filePath = join(uploadDir, filename)
  await writeFile(filePath, file.data)

  // 获取请求的基础 URL
  const requestUrl = getRequestURL(event)
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`

  return {
    url: `${baseUrl}/uploads/${fullRelativePath}`,
    filename,
    originalName: file.filename,
    size: file.data.length,
    mimeType,
  }
})
