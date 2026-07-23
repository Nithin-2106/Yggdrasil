import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { mockReqRes } from '../../_lib/__tests__/testHelpers.js'

let mongod
let handler
let authHandler
let User
let AnimeTop10
let tokenA, tokenB
let RateLimitAttempt

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()
  process.env.JWT_SECRET = 'test-secret'

  const { connectDB } = await import('../../_lib/mongodb.js')
  ;({ default: authHandler } = await import('../../auth/[action].js'))
  ;({ default: handler } = await import('../[...params].js'))
  ;({ default: User } = await import('../../_lib/models/User.js'))
  ;({ default: AnimeTop10 } = await import('../../_lib/models/AnimeTop10.js'))
  ;({ default: RateLimitAttempt } = await import('../../_lib/models/RateLimitAttempt.js'))

  await connectDB()
}, 30000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

async function registerAndLogin(username, email) {
  const { req, res } = mockReqRes({
    method: 'POST',
    query: { action: 'register' },
    body: { username, email, password: 'hunter22' },
  })
  await authHandler(req, res)
  return res._json.token
}

async function ensureListExists(token) {
  const { req, res } = mockReqRes({
    method: 'GET', query: { params: ['list'] }, headers: authHeader(token),
  })
  await handler(req, res)
}

beforeEach(async () => {
  await User.deleteMany({})
  await AnimeTop10.deleteMany({})
  await RateLimitAttempt.deleteMany({})
  tokenA = await registerAndLogin('userA', 'a@example.com')
  tokenB = await registerAndLogin('userB', 'b@example.com')

  await ensureListExists(tokenA)
  await ensureListExists(tokenB)
})

const authHeader = (token) => ({ authorization: `Bearer ${token}` })

const sampleSlotBody = {
  anilistId: 5114,
  title: 'Fullmetal Alchemist: Brotherhood',
  coverImage: 'https://example.com/fmab.jpg',
  year: 2009,
  format: 'Series',
}

describe('GET /api/animetop10/list', () => {
  it('returns a 10-slot list (already created in beforeEach)', async () => {
    const { req, res } = mockReqRes({
      method: 'GET',
      query: { params: ['list'] },
      headers: authHeader(tokenA),
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._json.entries).toHaveLength(10)
    expect(res._json.entries.every((e) => e.anilistId === null)).toBe(true)
  })

  it('returns 401 without a token', async () => {
    const { req, res } = mockReqRes({ method: 'GET', query: { params: ['list'] } })
    await handler(req, res)
    expect(res.statusCode).toBe(401)
  })

  it('is scoped per-user — userB does not see userA\'s list', async () => {
    // Populate userA's list
    const { req: reqA, res: resA } = mockReqRes({
      method: 'GET', query: { params: ['list'] }, headers: authHeader(tokenA),
    })
    await handler(reqA, resA)

    const { req: putReq, res: putRes } = mockReqRes({
      method: 'PUT', query: { params: ['1'] }, headers: authHeader(tokenA), body: sampleSlotBody,
    })
    await handler(putReq, putRes)

    // userB's list should still be empty
    const { req: reqB, res: resB } = mockReqRes({
      method: 'GET', query: { params: ['list'] }, headers: authHeader(tokenB),
    })
    await handler(reqB, resB)

    expect(resB._json.entries[0].anilistId).toBeNull()
  })
})

describe('PUT /api/animetop10/:position', () => {

  it('rejects an out-of-range position with 400 (explicit bounds check now exists)', async () => {
    const { req, res } = mockReqRes({
      method: 'PUT', query: { params: ['99'] }, headers: authHeader(tokenA), body: sampleSlotBody,
    })
    await handler(req, res)
    expect(res.statusCode).toBe(400)
  })

  it('fills the given slot', async () => {
    const { req, res } = mockReqRes({
      method: 'PUT',
      query: { params: ['3'] },
      headers: authHeader(tokenA),
      body: sampleSlotBody,
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    const slot3 = res._json.entries.find((e) => e.position === 3)
    expect(slot3.anilistId).toBe(5114)
    expect(slot3.title).toBe(sampleSlotBody.title)
  })

  it('does not affect other slots', async () => {
    const { req, res } = mockReqRes({
      method: 'PUT', query: { params: ['3'] }, headers: authHeader(tokenA), body: sampleSlotBody,
    })
    await handler(req, res)

    const other = res._json.entries.find((e) => e.position === 4)
    expect(other.anilistId).toBeNull()
  })

  it('returns 401 without a token', async () => {
    const { req, res } = mockReqRes({
      method: 'PUT', query: { params: ['3'] }, body: sampleSlotBody,
    })
    await handler(req, res)
    expect(res.statusCode).toBe(401)
  })

  it('does not let userB modify userA\'s slot', async () => {
    // userA fills slot 1
    const { req: reqA, res: resA } = mockReqRes({
      method: 'PUT', query: { params: ['1'] }, headers: authHeader(tokenA), body: sampleSlotBody,
    })
    await handler(reqA, resA)

    // userB fills their own slot 1 with different data
    const { req: reqB, res: resB } = mockReqRes({
      method: 'PUT',
      query: { params: ['1'] },
      headers: authHeader(tokenB),
      body: { ...sampleSlotBody, anilistId: 999, title: 'Different Anime' },
    })
    await handler(reqB, resB)

    // userA's slot 1 should be untouched
    const { req: checkReq, res: checkRes } = mockReqRes({
      method: 'GET', query: { params: ['list'] }, headers: authHeader(tokenA),
    })
    await handler(checkReq, checkRes)

    expect(checkRes._json.entries[0].anilistId).toBe(5114)
  })
})

describe('DELETE /api/animetop10/:position', () => {
  it('clears a filled slot', async () => {
    const { req: putReq, res: putRes } = mockReqRes({
      method: 'PUT', query: { params: ['5'] }, headers: authHeader(tokenA), body: sampleSlotBody,
    })
    await handler(putReq, putRes)

    const { req, res } = mockReqRes({
      method: 'DELETE', query: { params: ['5'] }, headers: authHeader(tokenA),
    })
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    const slot5 = res._json.entries.find((e) => e.position === 5)
    expect(slot5.anilistId).toBeNull()
    expect(slot5.title).toBe('')
  })

  it('returns 401 without a token', async () => {
    const { req, res } = mockReqRes({ method: 'DELETE', query: { params: ['5'] } })
    await handler(req, res)
    expect(res.statusCode).toBe(401)
  })
})