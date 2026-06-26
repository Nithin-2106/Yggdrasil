import { connectDB } from '../_lib/mongodb.js'
import MangaTop10 from '../_lib/models/MangaTop10.js'
import { requireAuth } from '../_lib/auth.js'

const emptySlots = () =>
  Array.from({ length: 10 }, (_, i) => ({
    position: i + 1, anilistId: null, title: '', coverImage: '', year: null, type: '', format: ''
  }))

export default async function handler(req, res) {
  await connectDB()
  const { user, error, status } = await requireAuth(req)
  if (error) return res.status(status).json({ message: error })

  const rawParams = req.query.params ?? req.query["...params"]

const params = Array.isArray(rawParams)
  ? rawParams
  : rawParams
    ? [rawParams]
    : []

const position = params[0] ? parseInt(params[0]) : null

  // GET /api/mangatop10
  if (!position && req.method === 'GET') {
    let doc = await MangaTop10.findOne({ userId: user._id })
    if (!doc) doc = await MangaTop10.create({ userId: user._id, entries: emptySlots() })
    return res.json(doc)
  }

  // PUT /api/mangatop10/[position]
  if (position && req.method === 'PUT') {
    let doc = await MangaTop10.findOne({ userId: user._id })
    if (!doc) return res.status(404).json({ message: 'List not found' })
    const idx = doc.entries.findIndex(e => e.position === position)
    if (idx === -1) return res.status(404).json({ message: 'Slot not found' })
    doc.entries[idx] = { position, ...req.body }
    doc.markModified('entries')
    await doc.save()
    return res.json(doc)
  }

  // DELETE /api/mangatop10/[position]
  if (position && req.method === 'DELETE') {
    const doc = await MangaTop10.findOne({ userId: user._id })
    if (!doc) return res.status(404).json({ message: 'List not found' })
    const idx = doc.entries.findIndex(e => e.position === position)
    if (idx !== -1) {
      doc.entries[idx] = { position, anilistId: null, title: '', coverImage: '', year: null, type: '', format: '' }
      doc.markModified('entries')
      await doc.save()
    }
    return res.json(doc)
  }

  res.status(405).json({ message: 'Method not allowed' })
}