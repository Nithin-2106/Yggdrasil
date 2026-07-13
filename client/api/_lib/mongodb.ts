import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) throw new Error('MONGODB_URI not set')

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// eslint-disable-next-line no-var
declare global {
  var mongoose: MongooseCache | undefined
}

let cached = global.mongoose
if (!cached) cached = global.mongoose = { conn: null, promise: null }

export async function connectDB(): Promise<typeof mongoose> {
  if (cached!.conn) return cached!.conn
  if (!cached!.promise) {
    cached!.promise = mongoose.connect(MONGODB_URI as string).then(m => m)
  }
  cached!.conn = await cached!.promise
  return cached!.conn
}