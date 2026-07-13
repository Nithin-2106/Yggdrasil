import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { mockReqRes } from '../../_lib/__tests__/testHelpers.js'

let mongod
let listHandler
let itemHandler
let authHandler
let User
let Top10
let tokenA, tokenB

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()
  process.env.JWT_SECRET = 'test-secret'

  const { connectDB } = await import('../../_lib/mongodb.js')
  ;({ default: authHandler } = await import('../../auth/[action].js'))
  ;({ default: listHandler } = await import('../[region]/index.js'))
  ;({ default: itemHandler } = await import('../[region]/[position].js'))
  ;({ default: User } = await import('../../_lib/models/User.js'))
  ;({ default: Top10 } = await import('../../_lib/models/Top10.js'))

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

const authHeader = (token) => ({ authorization: `Bearer ${token}` })

async function ensureRegionExists(region, token) {
  const { req, res } = mockReqRes({
    method: 'GET', query: { region }, headers: authHeader(token),
  })
  await listHandler(req, res)
}

beforeEach(async () => {
  await User.deleteMany({})
  await Top10.deleteMany({})
  tokenA = await registerAndLogin('userA', 'a@example.com')
  tokenB = await registerAndLogin('userB', 'b@example.com')

  // PUT/DELETE require the region doc to already exist — mirrors real
  // usage, since Dashboard's Top10Section always loads(region) on mount
  // and on every tab switch before showing edit controls.
  await ensureRegionExists('Korean', tokenA)
  await ensureRegionExists('Chinese', tokenA)
  await ensureRegionExists('Korean', tokenB)
})

const sampleSlotBody = {
  tmdbId: 94605,
  title: 'Arcane', // stand-in — TMDB drama in practice, doesn't matter for these tests
  coverImage: 'https://example.com/poster.jpg',
  year: 2023,
  type: 'Kdrama',
}

describe('GET /api/top10/:region', () => {
  it('returns a 10-slot list for the region', async () => {
    const { req, res } = mockReqRes({
      method: 'GET', query: { region: 'Korean' }, headers: authHeader(tokenA),
    })
    await listHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._json.entries).toHaveLength(10)
    expect(res._json.region).toBe('Korean')
  })

  it('keeps regions independent for the same user', async () => {
    // Fill a slot in Korean
    const { req: putReq, res: putRes } = mockReqRes({
      method: 'PUT',
      query: { region: 'Korean', position: '1' },
      headers: authHeader(tokenA),
      body: sampleSlotBody,
    })
    await itemHandler(putReq, putRes)

    // Chinese region for the same user should be untouched
    const { req, res } = mockReqRes({
      method: 'GET', query: { region: 'Chinese' }, headers: authHeader(tokenA),
    })
    await listHandler(req, res)

    expect(res._json.entries[0].tmdbId).toBeNull()
  })

  it('returns 401 without a token', async () => {
    const { req, res } = mockReqRes({ method: 'GET', query: { region: 'Korean' } })
    await listHandler(req, res)
    expect(res.statusCode).toBe(401)
  })

  it('is scoped per-user for the same region', async () => {
    const { req, res } = mockReqRes({
      method: 'GET', query: { region: 'Korean' }, headers: authHeader(tokenB),
    })
    await listHandler(req, res)

    expect(res._json.entries.every((e) => e.tmdbId === null)).toBe(true)
  })

  it('rejects a non-GET method', async () => {
    const { req, res } = mockReqRes({
      method: 'POST', query: { region: 'Korean' }, headers: authHeader(tokenA),
    })
    await listHandler(req, res)
    expect(res.statusCode).toBe(405)
  })
})

describe('PUT /api/top10/:region/:position', () => {
  it('fills the given slot in the given region', async () => {
    const { req, res } = mockReqRes({
      method: 'PUT',
      query: { region: 'Korean', position: '2' },
      headers: authHeader(tokenA),
      body: sampleSlotBody,
    })
    await itemHandler(req, res)

    expect(res.statusCode).toBe(200)
    const slot2 = res._json.entries.find((e) => e.position === 2)
    expect(slot2.tmdbId).toBe(94605)
  })

  it('rejects an out-of-range position with 400 (explicit bounds check exists here)', async () => {
    const { req, res } = mockReqRes({
      method: 'PUT',
      query: { region: 'Korean', position: '11' },
      headers: authHeader(tokenA),
      body: sampleSlotBody,
    })
    await itemHandler(req, res)

    expect(res.statusCode).toBe(400)
  })

  it('returns 404 for a region the user has never loaded', async () => {
    const { req, res } = mockReqRes({
      method: 'PUT',
      query: { region: 'Japanese', position: '1' }, // never GET'd for userA in beforeEach
      headers: authHeader(tokenA),
      body: sampleSlotBody,
    })
    await itemHandler(req, res)

    expect(res.statusCode).toBe(404)
  })

  it('does not let userB modify userA\'s Korean slot', async () => {
    const { req: reqA, res: resA } = mockReqRes({
      method: 'PUT',
      query: { region: 'Korean', position: '1' },
      headers: authHeader(tokenA),
      body: sampleSlotBody,
    })
    await itemHandler(reqA, resA)

    const { req: reqB, res: resB } = mockReqRes({
      method: 'PUT',
      query: { region: 'Korean', position: '1' },
      headers: authHeader(tokenB),
      body: { ...sampleSlotBody, tmdbId: 111, title: 'Different Show' },
    })
    await itemHandler(reqB, resB)

    // userA's slot should be untouched — userB has their own separate doc
    const { req: checkReq, res: checkRes } = mockReqRes({
      method: 'GET', query: { region: 'Korean' }, headers: authHeader(tokenA),
    })
    await listHandler(checkReq, checkRes)

    expect(checkRes._json.entries[0].tmdbId).toBe(94605)
  })

  it('returns 401 without a token', async () => {
    const { req, res } = mockReqRes({
      method: 'PUT', query: { region: 'Korean', position: '1' }, body: sampleSlotBody,
    })
    await itemHandler(req, res)
    expect(res.statusCode).toBe(401)
  })
})

describe('DELETE /api/top10/:region/:position', () => {
  it('clears a filled slot', async () => {
    const { req: putReq, res: putRes } = mockReqRes({
      method: 'PUT',
      query: { region: 'Korean', position: '4' },
      headers: authHeader(tokenA),
      body: sampleSlotBody,
    })
    await itemHandler(putReq, putRes)

    const { req, res } = mockReqRes({
      method: 'DELETE', query: { region: 'Korean', position: '4' }, headers: authHeader(tokenA),
    })
    await itemHandler(req, res)

    expect(res.statusCode).toBe(200)
    const slot4 = res._json.entries.find((e) => e.position === 4)
    expect(slot4.tmdbId).toBeNull()
    expect(slot4.title).toBe('')
  })

  it('returns 401 without a token', async () => {
    const { req, res } = mockReqRes({
      method: 'DELETE', query: { region: 'Korean', position: '4' },
    })
    await itemHandler(req, res)
    expect(res.statusCode).toBe(401)
  })
})