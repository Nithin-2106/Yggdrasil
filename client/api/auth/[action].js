import { connectDB } from '../_lib/mongodb.js'
import User from '../_lib/models/User.js'
import jwt from 'jsonwebtoken'
import { validateBody, ValidationError } from '../_lib/validate.js'
import { registerSchema, loginSchema } from '../_lib/schemas/auth.js'
import { rateLimitKey, countRecentAttempts, recordAttempt } from '../_lib/rateLimit.js'
import { withSentry, initSentry } from '../_lib/sentry.js'
import * as Sentry from '@sentry/node'

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' })

// Login: capped on FAILED attempts only, so a household/office sharing one
// IP can still log in normally — this targets credential brute-forcing,
// not normal traffic.
const LOGIN_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const LOGIN_MAX_ATTEMPTS = 5

// Register: capped on every well-formed attempt regardless of outcome —
// this targets scripted account-creation spam, not just successful signups.
const REGISTER_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const REGISTER_MAX_ATTEMPTS = 5

async function handler(req, res) {
  try {
    await connectDB()
    const { action } = req.query

    // POST /api/auth/login
    if (action === 'login' && req.method === 'POST') {
      const { email, password } = validateBody(loginSchema, req.body)

      const key = rateLimitKey(req, 'login')
      const recentFailures = await countRecentAttempts(key, LOGIN_WINDOW_MS)
      if (recentFailures >= LOGIN_MAX_ATTEMPTS) {
        return res.status(429).json({ message: 'Too many failed login attempts. Please try again later.' })
      }

      const user = await User.findOne({ email: email.toLowerCase() })
      if (!user || !(await user.comparePassword(password))) {
        await recordAttempt(key, LOGIN_WINDOW_MS)
        return res.status(401).json({ message: 'Invalid email or password' })
      }
      const token = signToken(user._id)
      return res.json({
        token,
        user: { id: user._id, username: user.username, email: user.email, profileImage: user.profileImage }
      })
    }

    // POST /api/auth/register
    if (action === 'register' && req.method === 'POST') {
      const { username, email, password, profileImage } = validateBody(registerSchema, req.body)

      const key = rateLimitKey(req, 'register')
      const recentAttempts = await countRecentAttempts(key, REGISTER_WINDOW_MS)
      if (recentAttempts >= REGISTER_MAX_ATTEMPTS) {
        return res.status(429).json({ message: 'Too many registration attempts from this network. Please try again later.' })
      }
      await recordAttempt(key, REGISTER_WINDOW_MS)

      const exists = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: { $regex: `^${username.trim()}$`, $options: 'i' } }
        ]
      })
      if (exists)
        return res.status(400).json({ message: 'Username or email already taken' })

      const user = await User.create({
        username: username.trim(),
        email: email.toLowerCase(),
        password,
        profileImage
      })
      const token = signToken(user._id)
      return res.status(201).json({
        token,
        user: { id: user._id, username: user.username, email: user.email, profileImage: user.profileImage }
      })
    }

    // GET /api/auth/me
    if (action === 'me' && req.method === 'GET') {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer '))
        return res.status(401).json({ message: 'No token' })
      const token = authHeader.split(' ')[1]

      let decoded
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET)
      } catch {
        return res.status(401).json({ message: 'Invalid or expired token' })
      }

      const user = await User.findById(decoded.id).select('-password')
      if (!user) return res.status(404).json({ message: 'User not found' })
      return res.json({
        id: user._id, username: user.username,
        email: user.email, profileImage: user.profileImage
      })
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ message: err.message })
    }
    console.error('Auth handler error:', err)
    Sentry.captureException(err)
    return res.status(500).json({ message: err.message || 'Internal server error' })
  }
}

export default withSentry(handler)