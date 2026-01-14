import { useDatabase } from '~/utils/db'

export default defineEventHandler(async () => {
  const db = useDatabase()

  const { rows } = await db.sql`
    SELECT id, filename, originalName, mimeType, size, x, y, createdAt
    FROM files
    ORDER BY createdAt DESC
  `

  return rows
})
