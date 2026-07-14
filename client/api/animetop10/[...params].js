import { connectDB } from '../_lib/mongodb.js'
import AnimeTop10 from '../_lib/models/AnimeTop10.js'
import { requireAuth } from '../_lib/auth.js'
import { validateBody, ValidationError } from '../_lib/validate.js'
import { animeSlotSchema, positionSchema } from '../_lib/schemas/top10.js'

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
    try {
      const validPosition = validateBody(positionSchema, position)
      const data = validateBody(animeSlotSchema, req.body)

      let doc = await AnimeTop10.findOne({ userId: user._id })
      if (!doc) return res.status(404).json({ message: 'List not found' })
      const idx = doc.entries.findIndex(e => e.position === validPosition)
      if (idx === -1) return res.status(404).json({ message: 'Slot not found' })
      doc.entries[idx] = { position: validPosition, ...data }
      doc.markModified('entries')
      await doc.save()
      return res.json(doc)
    } catch (err) {
      if (err instanceof ValidationError) return res.status(400).json({ message: err.message })
      throw err
    }
  }

  // DELETE /api/animetop10/[position]
  if (position && req.method === 'DELETE') {
    let validPosition
    try {
      validPosition = validateBody(positionSchema, position)
    } catch (err) {
      if (err instanceof ValidationError) return res.status(400).json({ message: err.message })
      throw err
    }
    const doc = await AnimeTop10.findOne({ userId: user._id })
    if (!doc) return res.status(404).json({ message: 'List not found' })
    const idx = doc.entries.findIndex(e => e.position === validPosition)
    if (idx !== -1) {
      doc.entries[idx] = { position: validPosition, anilistId: null, title: '', coverImage: '', year: null, format: '' }
      doc.markModified('entries')
      await doc.save()
    }
    return res.json(doc)
  }

  res.status(405).json({ message: 'Method not allowed' })
}