import { connectDB } from '../_lib/mongodb.js'
import MangaTop10 from '../_lib/models/MangaTop10.js'
import { requireAuth } from '../_lib/auth.js'

const emptySlots = () =>
  Array.from({ length: 10 }, (_, i) => ({
    position: i + 1,
    anilistId: null,
    title: '',
    coverImage: '',
    year: null,
    type: '',
    format: ''
  }))

export default async function handler(req, res) {
  await connectDB()

  const { user, error, status } = await requireAuth(req)
  if (error) return res.status(status).json({ message: error })

  if (req.method !== 'GET')
    return res.status(405).json({ message: 'Method not allowed' })

  let doc = await MangaTop10.findOne({ userId: user._id })

  if (!doc) {
    doc = await MangaTop10.create({
      userId: user._id,
      entries: emptySlots()
    })
  }

  return res.json(doc)
}