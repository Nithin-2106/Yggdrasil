import { connectDB } from '../../lib/mongodb.js'
import AnimeTop10 from '../../lib/models/AnimeTop10.js'
import { requireAuth } from '../../lib/auth.js'

const emptySlots = () =>
  Array.from({ length: 10 }, (_, i) => ({
    position: i + 1, malId: null, title: '', coverImage: '', year: null, format: ''
  }))

export default async function handler(req, res) {
  await connectDB()
  const { user, error, status } = await requireAuth(req)
  if (error) return res.status(status).json({ message: error })

  const params = req.query.params || []
  const position = params[0] ? parseInt(params[0]) : null

  // GET /api/animetop10
  if (!position && req.method === 'GET') {
    let doc = await AnimeTop10.findOne({ userId: user._id })
    if (!doc) doc = await AnimeTop10.create({ userId: user._id, entries: emptySlots() })
    return res.json(doc)
  }

  // PUT /api/animetop10/[position]
  if (position && req.method === 'PUT') {
    let doc = await AnimeTop10.findOne({ userId: user._id })
    if (!doc) return res.status(404).json({ message: 'List not found' })
    const idx = doc.entries.findIndex(e => e.position === position)
    if (idx === -1) return res.status(404).json({ message: 'Slot not found' })
    doc.entries[idx] = { position, ...req.body }
    doc.markModified('entries')
    await doc.save()
    return res.json(doc)
  }

  // DELETE /api/animetop10/[position]
  if (position && req.method === 'DELETE') {
    const doc = await AnimeTop10.findOne({ userId: user._id })
    if (!doc) return res.status(404).json({ message: 'List not found' })
    const idx = doc.entries.findIndex(e => e.position === position)
    if (idx !== -1) {
      doc.entries[idx] = { position, malId: null, title: '', coverImage: '', year: null, format: '' }
      doc.markModified('entries')
      await doc.save()
    }
    return res.json(doc)
  }

  res.status(405).json({ message: 'Method not allowed' })
}