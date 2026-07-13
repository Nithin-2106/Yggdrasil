import jwt from 'jsonwebtoken'
import { connectDB } from './mongodb.js'
import User, { IUser } from './models/User.js'
import type { ApiRequest } from './httpTypes.js'

interface AuthSuccess {
  user: IUser
  error?: undefined
  status?: undefined
}

interface AuthFailure {
  user?: undefined
  error: string
  status: number
}

export async function requireAuth(req: ApiRequest): Promise<AuthSuccess | AuthFailure> {
  const authHeader = req.headers['authorization']
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer '))
    return { error: 'Not authenticated', status: 401 }
  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string }
    await connectDB()
    const user = await User.findById(decoded.id).select('-password')
    if (!user) return { error: 'User not found', status: 401 }
    return { user }
  } catch {
    return { error: 'Invalid or expired token', status: 401 }
  }
}