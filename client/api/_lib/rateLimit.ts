import RateLimitAttempt from './models/RateLimitAttempt.js'
import type { ApiRequest } from './httpTypes.js'

// Vercel sits behind a proxy, so the real client IP arrives via
// x-forwarded-for (format: "client, proxy1, proxy2, ..."). Falls back to
// 'unknown' rather than throwing — worst case, all unidentifiable clients
// share one bucket, which is a safe failure mode for a rate limiter
// (slightly stricter, never silently disabled).
function getClientIp(req: ApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]
  }
  return 'unknown'
}

export function rateLimitKey(req: ApiRequest, action: string): string {
  return `${action}:${getClientIp(req)}`
}

export async function countRecentAttempts(key: string, windowMs: number): Promise<number> {
  const windowStart = new Date(Date.now() - windowMs)
  return RateLimitAttempt.countDocuments({ key, createdAt: { $gte: windowStart } })
}

export async function recordAttempt(key: string, windowMs: number): Promise<void> {
  await RateLimitAttempt.create({ key, expiresAt: new Date(Date.now() + windowMs) })
}