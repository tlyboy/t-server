import { createCipheriv, createDecipheriv, randomBytes, hkdf } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // GCM 推荐 12 字节 IV
const TAG_LENGTH = 16 // 认证标签长度

/**
 * 从主密钥派生特定聊天的加密密钥
 * 使用 HKDF (HMAC-based Key Derivation Function) 确保每个聊天有独立密钥
 */
async function deriveKey(masterKey: Buffer, chatId: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    hkdf(
      'sha256',
      masterKey,
      '', // salt 可以为空，因为主密钥已经是随机的
      `chat:${chatId}`, // info: 用于派生不同聊天的密钥
      32, // 输出 32 字节密钥 (256 位)
      (err, derivedKey) => {
        if (err) reject(err)
        else resolve(Buffer.from(derivedKey))
      }
    )
  })
}

/**
 * 获取加密主密钥
 */
function getMasterKey(): Buffer {
  const config = useRuntimeConfig()
  const keyBase64 = config.encryptionKey

  if (!keyBase64) {
    throw new Error('缺少加密密钥配置 (NITRO_ENCRYPTION_KEY)')
  }

  const key = Buffer.from(keyBase64, 'base64')
  if (key.length !== 32) {
    throw new Error('加密密钥长度必须为 32 字节 (256 位)')
  }

  return key
}

/**
 * 加密消息内容
 * @param plaintext 明文消息
 * @param chatId 聊天 ID (用于密钥派生)
 * @returns Base64 编码的密文 (格式: IV + AuthTag + Ciphertext)
 */
export async function encryptMessage(
  plaintext: string,
  chatId: number
): Promise<string> {
  const masterKey = getMasterKey()
  const key = await deriveKey(masterKey, chatId)

  // 生成随机 IV
  const iv = randomBytes(IV_LENGTH)

  // 创建加密器
  const cipher = createCipheriv(ALGORITHM, key, iv)

  // 加密
  let encrypted = cipher.update(plaintext, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])

  // 获取认证标签
  const tag = cipher.getAuthTag()

  // 组合: IV (12) + Tag (16) + Ciphertext
  const result = Buffer.concat([iv, tag, encrypted])

  return result.toString('base64')
}

/**
 * 解密消息内容
 * @param ciphertext Base64 编码的密文
 * @param chatId 聊天 ID (用于密钥派生)
 * @returns 解密后的明文
 */
export async function decryptMessage(
  ciphertext: string,
  chatId: number
): Promise<string> {
  const masterKey = getMasterKey()
  const key = await deriveKey(masterKey, chatId)

  // 解码 Base64
  const data = Buffer.from(ciphertext, 'base64')

  // 提取各部分
  const iv = data.subarray(0, IV_LENGTH)
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH)

  // 创建解密器
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  // 解密
  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString('utf8')
}

/**
 * 检查消息是否已加密 (通过尝试 Base64 解码和长度检查)
 */
export function isEncryptedFormat(content: string): boolean {
  try {
    const data = Buffer.from(content, 'base64')
    // 最小长度: IV (12) + Tag (16) + 至少 1 字节密文 = 29
    return data.length >= IV_LENGTH + TAG_LENGTH + 1
  } catch {
    return false
  }
}

/**
 * 生成新的加密密钥 (用于初始化配置)
 * 运行: npx tsx -e "import('./server/utils/crypto').then(m => console.log(m.generateEncryptionKey()))"
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('base64')
}
