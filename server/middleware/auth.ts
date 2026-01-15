const whiteList = [
  '/',
  '/v1/user/login',
  '/v1/user/register',
  '/v1/user/refresh',
  '/v1/file',
  '/v1/file/list',
]

export default defineEventHandler(async (event) => {
  // 允许 OPTIONS 请求通过
  if (event.node.req.method === 'OPTIONS') {
    return
  }

  const pathname = getRequestURL(event).pathname

  // 静态文件路径无需认证
  if (pathname.startsWith('/uploads/')) {
    return
  }

  // 文件下载路径无需认证
  if (pathname.startsWith('/v1/file/download/')) {
    return
  }

  // 文件取件码验证路径无需认证
  if (pathname.startsWith('/v1/file/verify/')) {
    return
  }

  // 文件更新路径无需认证 (PATCH /v1/file/:id)
  if (/^\/v1\/file\/\d+$/.test(pathname)) {
    return
  }

  // 文件存储路径无需认证
  if (pathname.startsWith('/files/')) {
    return
  }

  if (whiteList.some((path) => pathname === path)) {
    return
  }

  const token = getHeader(event, 'Authorization')?.replace('Bearer ', '')

  if (!token) {
    throw createError({
      statusCode: 401,
      message: '未提供认证令牌',
    })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    throw createError({
      statusCode: 401,
      statusMessage: 'TOKEN_EXPIRED',
      message: '认证令牌已过期或无效',
    })
  }

  event.context.auth = decoded
})
