import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { mockReqRes } from '../../_lib/__tests__/testHelpers.js'

let mongod
let listHandler
let itemHandler
let User
let Anime

// A valid-looking JWT is required by requireAuth for every call, so we
// register two real users through the auth handler and log in as each,
// rather than hand-rolling tokens — keeps this test aligned with how
// auth actually issues tokens.
let authHandler
let userA, userB
let tokenA, tokenB

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()
  process.env.JWT_SECRET = 'test-secret'

  const { connectDB } = await import('../../_lib/mongodb.js')
  ;({ default: authHandler } = await import('../../auth/[action].js'))
  const factory = await import('../../_lib/crudFactory.js')
  listHandler = factory.createListHandler()
  itemHandler = factory.createItemHandler()
  ;({ default: User } = await import('../../_lib/models/User.js'))
  ;({ default: Anime } = await import('../../_lib/models/Anime.js'))

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
  return { token: res._json.token, userId: res._json.user.id }
}

beforeEach(async () => {
  await User.deleteMany({})
  await Anime.deleteMany({})

  const a = await registerAndLogin('userA', 'a@example.com')
  const b = await registerAndLogin('userB', 'b@example.com')
  userA = a.userId
  userB = b.userId
  tokenA = a.token
  tokenB = b.token
})

const authHeader = (token) => ({ authorization: `Bearer ${token}` })

const sampleAnime = {
  title: 'Test Anime',
  malId: 12345,
  status: 'Watching',
  format: 'Series',
}

describe('createListHandler — GET /api/media/anime', () => {
  it('only returns the requesting user\'s entries', async () => {
    await Anime.create({ ...sampleAnime, title: 'A1', userId: userA })
    await Anime.create({ ...sampleAnime, title: 'B1', userId: userB, malId: 999 })

    const { req, res } = mockReqRes({
      method: 'GET',
      query: { type: 'anime' },
      headers: authHeader(tokenA),
    })

    await listHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._json).toHaveLength(1)
    expect(res._json[0].title).toBe('A1')
  })

  it('returns 401 without a token', async () => {
    const { req, res } = mockReqRes({ method: 'GET', query: { type: 'anime' } })
    await listHandler(req, res)
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 for an unknown media type', async () => {
    const { req, res } = mockReqRes({
      method: 'GET',
      query: { type: 'notarealtype' },
      headers: authHeader(tokenA),
    })
    await listHandler(req, res)
    expect(res.statusCode).toBe(404)
  })
})

describe('createListHandler — POST /api/media/anime', () => {
  it('creates an entry scoped to the authenticated user', async () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      query: { type: 'anime' },
      headers: authHeader(tokenA),
      body: sampleAnime,
    })

    await listHandler(req, res)

    expect(res.statusCode).toBe(201)
    expect(res._json.userId).toBe(userA)

    const stored = await Anime.findOne({ title: 'Test Anime' })
    expect(stored.userId.toString()).toBe(userA)
  })

  it('ignores a client-supplied userId and uses the authenticated user instead', async () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      query: { type: 'anime' },
      headers: authHeader(tokenA),
      body: { ...sampleAnime, userId: userB }, // attempt to spoof ownership
    })

    await listHandler(req, res)

    expect(res._json.userId).toBe(userA)
  })
})

describe('createItemHandler — GET/PUT/DELETE /api/media/anime/:id', () => {
  let entryId

  beforeEach(async () => {
    const entry = await Anime.create({ ...sampleAnime, userId: userA })
    entryId = entry._id.toString()
  })

  it('lets the owner read their own entry', async () => {
    const { req, res } = mockReqRes({
      method: 'GET',
      query: { type: 'anime', id: entryId },
      headers: authHeader(tokenA),
    })
    await itemHandler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res._json._id).toBe(entryId)
  })

  it('blocks a different user from reading it — returns 404, not the data', async () => {
    const { req, res } = mockReqRes({
      method: 'GET',
      query: { type: 'anime', id: entryId },
      headers: authHeader(tokenB),
    })
    await itemHandler(req, res)
    expect(res.statusCode).toBe(404)
    expect(res._json).not.toHaveProperty('title')
  })

  it('lets the owner update their own entry', async () => {
    const { req, res } = mockReqRes({
      method: 'PUT',
      query: { type: 'anime', id: entryId },
      headers: authHeader(tokenA),
      body: { ...sampleAnime, status: 'Completed' },
    })
    await itemHandler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res._json.status).toBe('Completed')
  })

  it('blocks a different user from updating it', async () => {
    const { req, res } = mockReqRes({
      method: 'PUT',
      query: { type: 'anime', id: entryId },
      headers: authHeader(tokenB),
      body: { ...sampleAnime, status: 'Dropped' },
    })
    await itemHandler(req, res)
    expect(res.statusCode).toBe(404)

    // Confirm the entry was NOT modified by the attempted cross-user write
    const stillOwnedByA = await Anime.findById(entryId)
    expect(stillOwnedByA.status).toBe('Watching')
  })

  it('blocks a different user from deleting it', async () => {
    const { req, res } = mockReqRes({
      method: 'DELETE',
      query: { type: 'anime', id: entryId },
      headers: authHeader(tokenB),
    })
    await itemHandler(req, res)
    expect(res.statusCode).toBe(404)

    const stillExists = await Anime.findById(entryId)
    expect(stillExists).not.toBeNull()
  })

  it('lets the owner delete their own entry', async () => {
    const { req, res } = mockReqRes({
      method: 'DELETE',
      query: { type: 'anime', id: entryId },
      headers: authHeader(tokenA),
    })
    await itemHandler(req, res)
    expect(res.statusCode).toBe(200)

    const gone = await Anime.findById(entryId)
    expect(gone).toBeNull()
  })

  it('returns 404 for a nonexistent id', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString()
    const { req, res } = mockReqRes({
      method: 'GET',
      query: { type: 'anime', id: fakeId },
      headers: authHeader(tokenA),
    })
    await itemHandler(req, res)
    expect(res.statusCode).toBe(404)
  })
})