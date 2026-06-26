import { connectDB } from '../_lib/mongodb.js'
import AnimeTop10 from '../_lib/models/AnimeTop10.js'
import { requireAuth } from '../_lib/auth.js'

const emptySlots = () =>
  Array.from({ length: 10 }, (_, i) => ({
    position: i + 1,
    malId: null,
    title: '',
    coverImage: '',
    year: null,
    format: ''
  }))

export default async function handler(req, res) {
  await connectDB()

  const { user, error, status } = await requireAuth(req)
  if (error) return res.status(status).json({ message: error })

  if (req.method !== 'GET')
    return res.status(405).json({ message: 'Method not allowed' })

  let doc = await AnimeTop10.findOne({ userId: user._id })

  if (!doc) {
    doc = await AnimeTop10.create({
      userId: user._id,
      entries: emptySlots()
    })
  }

  return res.json(doc)
}