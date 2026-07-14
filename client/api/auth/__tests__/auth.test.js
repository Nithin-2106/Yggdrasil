import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import { mockReqRes } from '../../_lib/__tests__/testHelpers.js'

let mongod
let handler
let User
let RateLimitAttempt

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()
  process.env.JWT_SECRET = 'test-secret'

  // Dynamic import AFTER env vars exist — mongodb.ts reads
  // process.env.MONGODB_URI at module load time and throws if unset.
  const { connectDB } = await import('../../_lib/mongodb.js')
  ;({ default: handler } = await import('../[action].js'))
  ;({ default: User } = await import('../../_lib/models/User.js'))
  ;({ default: RateLimitAttempt } = await import('../../_lib/models/RateLimitAttempt.js'))

  // Actually establish the connection — the handler calls connectDB()
  // per-request, but beforeEach's deleteMany() runs before any request
  // fires, so without this Mongoose buffers commands against nothing
  // and times out.
  await connectDB()
}, 30000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

beforeEach(async () => {
  await User.deleteMany({})
  await RateLimitAttempt.deleteMany({})
})

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token', async () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      query: { action: 'register' },
      body: { username: 'shadow', email: 'shadow@example.com', password: 'hunter22' },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(201)
    expect(res._json.token).toBeTruthy()
    expect(res._json.user.username).toBe('shadow')
    expect(res._json.user.email).toBe('shadow@example.com')
  })

  it('hashes the password — never stores it in plaintext', async () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      query: { action: 'register' },
      body: { username: 'shadow', email: 'shadow@example.com', password: 'hunter22' },
    })

    await handler(req, res)

    const stored = await User.findOne({ email: 'shadow@example.com' })
    expect(stored.password).not.toBe('hunter22')
    expect(stored.password.length).toBeGreaterThan(20) // bcrypt hash length
  })

  it('rejects a duplicate email', async () => {
    await User.create({ username: 'first', email: 'dup@example.com', password: 'hunter22' })

    const { req, res } = mockReqRes({
      method: 'POST',
      query: { action: 'register' },
      body: { username: 'second', email: 'dup@example.com', password: 'hunter22' },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res._json.message).toMatch(/already taken/i)
  })

  it('rejects a duplicate username (case-insensitive)', async () => {
    await User.create({ username: 'Shadow', email: 'a@example.com', password: 'hunter22' })

    const { req, res } = mockReqRes({
      method: 'POST',
      query: { action: 'register' },
      body: { username: 'shadow', email: 'b@example.com', password: 'hunter22' },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
  })

  it('rejects a password under 6 characters', async () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      query: { action: 'register' },
      body: { username: 'shadow', email: 'shadow@example.com', password: '123' },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
  })

  it('rejects missing required fields', async () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      query: { action: 'register' },
      body: { email: 'shadow@example.com', password: 'hunter22' }, // no username
    })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    // Created via the model so the pre-save bcrypt hook runs
    await User.create({ username: 'shadow', email: 'shadow@example.com', password: 'hunter22' })
  })

  it('logs in with correct credentials', async () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      query: { action: 'login' },
      body: { email: 'shadow@example.com', password: 'hunter22' },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._json.token).toBeTruthy()
    expect(res._json.user.username).toBe('shadow')
  })

  it('is case-insensitive on email', async () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      query: { action: 'login' },
      body: { email: 'SHADOW@EXAMPLE.COM', password: 'hunter22' },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
  })

  it('rejects a wrong password', async () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      query: { action: 'login' },
      body: { email: 'shadow@example.com', password: 'wrongpass' },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(401)
  })

  it('rejects an unknown email', async () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      query: { action: 'login' },
      body: { email: 'nobody@example.com', password: 'hunter22' },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(401)
  })

  it('rejects a missing password', async () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      query: { action: 'login' },
      body: { email: 'shadow@example.com' },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
  })
})

describe('GET /api/auth/me', () => {
  let user

  beforeEach(async () => {
    user = await User.create({ username: 'shadow', email: 'shadow@example.com', password: 'hunter22' })
  })

  it('returns the user for a valid token', async () => {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' })
    const { req, res } = mockReqRes({
      method: 'GET',
      query: { action: 'me' },
      headers: { authorization: `Bearer ${token}` },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._json.username).toBe('shadow')
    expect(res._json.password).toBeUndefined() // never leak the hash
  })

  it('rejects a missing token', async () => {
    const { req, res } = mockReqRes({
      method: 'GET',
      query: { action: 'me' },
      headers: {},
    })

    await handler(req, res)

    expect(res.statusCode).toBe(401)
  })

  it('rejects a malformed token with 401 (not 500)', async () => {
    const { req, res } = mockReqRes({
      method: 'GET',
      query: { action: 'me' },
      headers: { authorization: 'Bearer not-a-real-token' },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(401)
  })

  it('rejects a token for a deleted user', async () => {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' })
    await User.deleteOne({ _id: user._id })

    const { req, res } = mockReqRes({
      method: 'GET',
      query: { action: 'me' },
      headers: { authorization: `Bearer ${token}` },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(404)
  })
})

describe('Rate limiting', () => {
  it('blocks login after 5 failed attempts, even with the correct password on the 6th try', async () => {
    await User.create({ username: 'limited', email: 'limited@example.com', password: 'hunter22' })

    for (let i = 0; i < 5; i++) {
      const { req, res } = mockReqRes({
        method: 'POST',
        query: { action: 'login' },
        body: { email: 'limited@example.com', password: 'wrongpass' },
      })
      await handler(req, res)
      expect(res.statusCode).toBe(401)
    }

    const { req, res } = mockReqRes({
      method: 'POST',
      query: { action: 'login' },
      body: { email: 'limited@example.com', password: 'hunter22' }, // correct this time
    })
    await handler(req, res)

    expect(res.statusCode).toBe(429)
  })

  it('does not count successful logins toward the failed-attempt limit', async () => {
    await User.create({ username: 'ok', email: 'ok@example.com', password: 'hunter22' })

    for (let i = 0; i < 10; i++) {
      const { req, res } = mockReqRes({
        method: 'POST',
        query: { action: 'login' },
        body: { email: 'ok@example.com', password: 'hunter22' },
      })
      await handler(req, res)
      expect(res.statusCode).toBe(200)
    }
  })

  it('blocks registration after 5 attempts from the same source within the window', async () => {
    for (let i = 0; i < 5; i++) {
      const { req, res } = mockReqRes({
        method: 'POST',
        query: { action: 'register' },
        body: { username: `spam${i}`, email: `spam${i}@example.com`, password: 'hunter22' },
      })
      await handler(req, res)
      expect(res.statusCode).toBe(201)
    }

    const { req, res } = mockReqRes({
      method: 'POST',
      query: { action: 'register' },
      body: { username: 'spam6', email: 'spam6@example.com', password: 'hunter22' },
    })
    await handler(req, res)

    expect(res.statusCode).toBe(429)
  })

  it('does not count requests that fail body validation toward the register limit', async () => {
    for (let i = 0; i < 10; i++) {
      const { req, res } = mockReqRes({
        method: 'POST',
        query: { action: 'register' },
        body: { email: 'bad@example.com', password: '123' }, // missing username, weak password
      })
      await handler(req, res)
      expect(res.statusCode).toBe(400)
    }

    // None of the malformed attempts above should have counted — this
    // should still succeed.
    const { req, res } = mockReqRes({
      method: 'POST',
      query: { action: 'register' },
      body: { username: 'finally', email: 'finally@example.com', password: 'hunter22' },
    })
    await handler(req, res)

    expect(res.statusCode).toBe(201)
  })
})