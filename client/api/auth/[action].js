import { connectDB } from '../../lib/mongodb.js'
import User from '../../lib/models/User.js'
import jwt from 'jsonwebtoken'

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' })

export default async function handler(req, res) {
  await connectDB()
  const { action } = req.query

  // POST /api/auth/login
  if (action === 'login' && req.method === 'POST') {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' })
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' })
    const token = signToken(user._id)
    return res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email, profileImage: user.profileImage }
    })
  }

  // POST /api/auth/register
  if (action === 'register' && req.method === 'POST') {
    const { username, email, password, profileImage } = req.body
    if (!username || !email || !password)
      return res.status(400).json({ message: 'Username, email and password are required' })
    const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] })
    if (exists)
      return res.status(400).json({ message: 'Username or email already taken' })
    const user = await User.create({ username, email: email.toLowerCase(), password, profileImage })
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    return res.json({
      id: user._id, username: user.username,
      email: user.email, profileImage: user.profileImage
    })
  }

  res.status(405).json({ message: 'Method not allowed' })
}