import { connectDB } from '../../_lib/mongodb.js'
import Top10 from '../../_lib/models/Top10.js'
import { requireAuth } from '../../_lib/auth.js'

const emptySlots = () =>
  Array.from({ length: 10 }, (_, i) => ({
    position: i + 1, tmdbId: null, title: '', coverImage: '', year: null, type: ''
  }))

export default async function handler(req, res) {
  await connectDB()
  const { user, error, status } = await requireAuth(req)
  if (error) return res.status(status).json({ message: error })

  const params = req.query.params || []
  const region = params[0]
  const position = params[1] ? parseInt(params[1]) : null

  if (!region) return res.status(400).json({ message: 'Region required' })

  // GET /api/top10/[region]
  if (!position && req.method === 'GET') {
    let doc = await Top10.findOne({ region, userId: user._id })
    if (!doc) doc = await Top10.create({ region, userId: user._id, entries: emptySlots() })
    return res.json(doc)
  }

  // PUT /api/top10/[region]/[position]
  if (position && req.method === 'PUT') {
    let doc = await Top10.findOne({ region, userId: user._id })
    if (!doc) return res.status(404).json({ message: 'Region not found' })
    const idx = doc.entries.findIndex(e => e.position === position)
    if (idx === -1) return res.status(404).json({ message: 'Slot not found' })
    doc.entries[idx] = { position, ...req.body }
    doc.markModified('entries')
    await doc.save()
    return res.json(doc)
  }

  // DELETE /api/top10/[region]/[position]
  if (position && req.method === 'DELETE') {
    const doc = await Top10.findOne({ region, userId: user._id })
    if (!doc) return res.status(404).json({ message: 'Region not found' })
    const idx = doc.entries.findIndex(e => e.position === position)
    if (idx !== -1) {
      doc.entries[idx] = { position, tmdbId: null, title: '', coverImage: '', year: null, type: '' }
      doc.markModified('entries')
      await doc.save()
    }
    return res.json(doc)
  }

  res.status(405).json({ message: 'Method not allowed' })
}