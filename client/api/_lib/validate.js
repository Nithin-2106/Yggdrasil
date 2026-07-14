import { ZodError } from 'zod'

/**
 * Parses `body` against `schema`. On success, returns the parsed
 * (and type-coerced/defaulted) data. On failure, throws a ValidationError
 * carrying a single human-readable message — callers should catch this
 * and respond with { message } at whatever status code they choose
 * (almost always 400).
 */
export class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function validateBody(schema, body) {
  try {
    return schema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      // Surface just the first issue as a single friendly message —
      // keeps the { message: string } response shape the frontend
      // already expects everywhere (e.g. err.response?.data?.message
      // in ProfilePage.jsx, InfoPage.jsx modals, etc.) with zero
      // frontend changes required.
      const first = err.issues[0]
      const field = first.path.join('.')
      const message = field ? `${field}: ${first.message}` : first.message
      throw new ValidationError(message)
    }
    throw err
  }
}