import { connectDB } from '../_lib/mongodb.js'
import AnimeTop10 from '../_lib/models/AnimeTop10.js'
import { requireAuth } from '../_lib/auth.js'

const emptySlots = () =>
  Array.from({ length: 10 }, (_, i) => ({
    position: i + 1, malId: null, title: '', coverImage: '', year: null, format: ''
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

const first = params[0];

const isList = first === "list";
const position = isList ? null : (first ? parseInt(first) : null);

  // GET /api/animetop10
  if (isList && req.method === "GET") {
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