import * as Sentry from '@sentry/node'

let initialized = false

export function initSentry() {
  if (initialized) return
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return // no DSN configured (e.g. local dev) — stay a no-op
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    // Error-only monitoring — no perf tracing, keeps this well within the
    // free tier for a single-user hobby project.
    tracesSampleRate: 0,
  })
  initialized = true
}

/**
 * Wraps a Vercel serverless handler so any exception that escapes it
 * (unhandled DB errors, bugs in crudFactory, etc.) is reported to Sentry
 * before the request gets a 500. Handlers with their own try/catch
 * (auth, ai/chat) should additionally call Sentry.captureException in
 * their own catch blocks — this wrapper only sees what bubbles past them.
 */
export function withSentry(handler: (req: any, res: any) => any) {
  initSentry()
  return async function wrapped(req: any, res: any) {
    try {
      return await handler(req, res)
    } catch (err) {
      Sentry.captureException(err)
      await Sentry.flush(2000) // serverless can freeze right after the response — flush first
      if (!res.headersSent) {
        res.status(500).json({ message: 'Internal server error' })
      }
    }
  }
}