import { connectDB } from './mongodb.js'
import { requireAuth } from './auth.js'
import { MEDIA_MODELS, isMediaType } from './models/mediaModels.js'
import { validateBody, ValidationError } from './validate.js'
import { MEDIA_SCHEMAS, MEDIA_UPDATE_SCHEMAS } from './schemas/media.js'
import type { ApiRequest, ApiResponse } from './httpTypes.js'

// Resolves the Mongoose model for the current request's `type` param.
// Writes a 404 and returns null if the type isn't recognized.
function resolveModel(req: ApiRequest, res: ApiResponse) {
  const { type } = req.query
  if (!isMediaType(type)) {
    res.status(404).json({ message: `Unknown media type: ${type}` })
    return null
  }
  return MEDIA_MODELS[type]
}

// Shared handler for GET (list) / POST (create) on /api/media/[type]
// Matches the exact behavior of the former anime/manga/drama index.js files:
// - list sorted by title ascending
// - create scoped to the authenticated user
export function createListHandler() {
  return async function handler(req: ApiRequest, res: ApiResponse) {
    await connectDB()
    const { user, error, status } = await requireAuth(req)
    if (error) return res.status(status).json({ message: error })

    const { type } = req.query
    const Model = resolveModel(req, res)
    if (!Model) return

    if (req.method === 'GET') {
      const items = await Model.find({ userId: user._id }).sort({ title: 1 })
      return res.json(items)
    }

    if (req.method === 'POST') {
      try {
        const data = validateBody(MEDIA_SCHEMAS[type as keyof typeof MEDIA_SCHEMAS], req.body)
        const item = await Model.create({ ...data, userId: user._id })
        return res.status(201).json(item)
      } catch (err) {
        if (err instanceof ValidationError) return res.status(400).json({ message: err.message })
        throw err
      }
    }

    res.status(405).json({ message: 'Method not allowed' })
  }
}

// Shared handler for GET (single) / PUT (update) / DELETE on /api/media/[type]/[id]
// Matches the exact behavior of the former anime/manga/drama [id].js files.
export function createItemHandler() {
  return async function handler(req: ApiRequest, res: ApiResponse) {
    await connectDB()
    const { user, error, status } = await requireAuth(req)
    if (error) return res.status(status).json({ message: error })

    const { type } = req.query
    const Model = resolveModel(req, res)
    if (!Model) return

    const { id } = req.query

    if (req.method === 'GET') {
      const item = await Model.findOne({ _id: id, userId: user._id })
      if (!item) return res.status(404).json({ message: 'Not found' })
      return res.json(item)
    }

    if (req.method === 'PUT') {
      try {
        const data = validateBody(MEDIA_UPDATE_SCHEMAS[type as keyof typeof MEDIA_UPDATE_SCHEMAS], req.body)
        const item = await Model.findOneAndUpdate(
          { _id: id, userId: user._id },
          data,
          { new: true, runValidators: true }
        )
        if (!item) return res.status(404).json({ message: 'Not found' })
        return res.json(item)
      } catch (err) {
        if (err instanceof ValidationError) return res.status(400).json({ message: err.message })
        throw err
      }
    }

    if (req.method === 'DELETE') {
      const item = await Model.findOneAndDelete({ _id: id, userId: user._id })
      if (!item) return res.status(404).json({ message: 'Not found' })
      return res.json({ message: 'Deleted successfully' })
    }

    res.status(405).json({ message: 'Method not allowed' })
  }
}