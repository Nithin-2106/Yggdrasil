import { connectDB } from './mongodb.js'
import { requireAuth } from './auth.js'
import { MEDIA_MODELS } from './models/mediaModels.js'

// Resolves the Mongoose model for the current request's `type` param.
// Writes a 404 and returns null if the type isn't recognized.
function resolveModel(req, res) {
  const { type } = req.query
  const Model = MEDIA_MODELS[type]
  if (!Model) {
    res.status(404).json({ message: `Unknown media type: ${type}` })
    return null
  }
  return Model
}

// Shared handler for GET (list) / POST (create) on /api/media/[type]
// Matches the exact behavior of the former anime/manga/drama index.js files:
// - list sorted by title ascending
// - create scoped to the authenticated user
export function createListHandler() {
  return async function handler(req, res) {
    await connectDB()
    const { user, error, status } = await requireAuth(req)
    if (error) return res.status(status).json({ message: error })

    const Model = resolveModel(req, res)
    if (!Model) return

    if (req.method === 'GET') {
      const items = await Model.find({ userId: user._id }).sort({ title: 1 })
      return res.json(items)
    }

    if (req.method === 'POST') {
      const item = await Model.create({ ...req.body, userId: user._id })
      return res.status(201).json(item)
    }

    res.status(405).json({ message: 'Method not allowed' })
  }
}

// Shared handler for GET (single) / PUT (update) / DELETE on /api/media/[type]/[id]
// Matches the exact behavior of the former anime/manga/drama [id].js files.
export function createItemHandler() {
  return async function handler(req, res) {
    await connectDB()
    const { user, error, status } = await requireAuth(req)
    if (error) return res.status(status).json({ message: error })

    const Model = resolveModel(req, res)
    if (!Model) return

    const { id } = req.query

    if (req.method === 'GET') {
      const item = await Model.findOne({ _id: id, userId: user._id })
      if (!item) return res.status(404).json({ message: 'Not found' })
      return res.json(item)
    }

    if (req.method === 'PUT') {
      const item = await Model.findOneAndUpdate(
        { _id: id, userId: user._id },
        req.body,
        { new: true, runValidators: true }
      )
      if (!item) return res.status(404).json({ message: 'Not found' })
      return res.json(item)
    }

    if (req.method === 'DELETE') {
      const item = await Model.findOneAndDelete({ _id: id, userId: user._id })
      if (!item) return res.status(404).json({ message: 'Not found' })
      return res.json({ message: 'Deleted successfully' })
    }

    res.status(405).json({ message: 'Method not allowed' })
  }
}