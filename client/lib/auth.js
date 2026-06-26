import jwt from 'jsonwebtoken'
import { connectDB } from './mongodb.js'
import User from './models/User.js'

export async function requireAuth(req) {
  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Not authenticated', status: 401 }
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    await connectDB()
    const user = await User.findById(decoded.id).select('-password')
    if (!user) return { error: 'User not found', status: 401 }
    return { user }
  } catch {
    return { error: 'Invalid or expired token', status: 401 }
  }
}