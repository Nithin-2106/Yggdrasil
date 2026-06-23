const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, profileImage } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ message: 'Username, email and password are required' });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists)
      return res.status(400).json({ message: 'Username or email already taken' });

    const user = await User.create({ username, email, password, profileImage });
    const token = signToken(user._id);

    res.status(201).json({
      token,
      user: {
        id:           user._id,
        username:     user.username,
        email:        user.email,
        profileImage: user.profileImage,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    const token = signToken(user._id);

    res.json({
      token,
      user: {
        id:           user._id,
        username:     user.username,
        email:        user.email,
        profileImage: user.profileImage,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me  — verify token and return current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
      return res.status(401).json({ message: 'No token' });

    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      id:           user._id,
      username:     user.username,
      email:        user.email,
      profileImage: user.profileImage,
    });
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

module.exports = router;
