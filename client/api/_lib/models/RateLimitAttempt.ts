import mongoose, { Document, Model } from 'mongoose'

export interface IRateLimitAttempt extends Document {
  key: string
  expiresAt: Date
  createdAt: Date
}

const rateLimitAttemptSchema = new mongoose.Schema<IRateLimitAttempt>({
  key:       { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true })

// TTL cleanup so the collection doesn't grow unbounded. Actual rate-limit
// counting below uses an explicit `createdAt` time-window query, NOT this
// index — MongoDB's TTL monitor only sweeps roughly once a minute, so it's
// housekeeping, not the source of truth for "is this request allowed."
rateLimitAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default (mongoose.models.RateLimitAttempt as Model<IRateLimitAttempt>) ||
  mongoose.model<IRateLimitAttempt>('RateLimitAttempt', rateLimitAttemptSchema)