export default defineEventHandler(async (event) => {
  const userId = event.context.auth?.userId

  if (!userId) {
    throw createError({
      statusCode: 401,
      message: '未登录',
    })
  }

  const body = await readBody(event)
  const { refreshToken, logoutAll } = body

  if (logoutAll) {
    // 吊销所有设备的 Refresh Token
    await revokeAllRefreshTokens(userId)
  } else if (refreshToken) {
    // 只吊销当前设备的 Refresh Token
    await revokeRefreshToken(refreshToken)
  }

  return { success: true, message: '已退出登录' }
})
