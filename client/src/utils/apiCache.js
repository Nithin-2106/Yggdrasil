// client/src/utils/apiCache.js
// Lightweight in-memory TTL cache shared across the three realm search
// utils. Module-level `Map`, so it lives for the tab's lifetime and resets
// on full reload — that's fine here since the goal is just avoiding
// refetches during normal Dashboard → Info → back navigation, not
// long-term persistence.

const cache = new Map()      // key -> { value, expiresAt }
const pending = new Map()    // key -> in-flight Promise (dedupes concurrent calls)

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return undefined
  }
  return entry.value
}

function setCached(key, value, ttlMs) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

/**
 * Runs `fn()` and caches its resolved value under `key` for `ttlMs`.
 * - A fresh, unexpired hit returns immediately with no network call.
 * - Concurrent calls with the same key while one is in flight share the
 *   same promise instead of firing duplicate requests.
 * - Rejections are never cached — a failed call is retried next time.
 */
export async function withCache(key, ttlMs, fn) {
  const hit = getCached(key)
  if (hit !== undefined) return hit

  if (pending.has(key)) return pending.get(key)

  const promise = (async () => {
    try {
      const value = await fn()
      setCached(key, value, ttlMs)
      return value
    } finally {
      pending.delete(key)
    }
  })()

  pending.set(key, promise)
  return promise
}

// Exposed mainly for debugging / manual invalidation if ever needed.
export function clearApiCache() {
  cache.clear()
  pending.clear()
}