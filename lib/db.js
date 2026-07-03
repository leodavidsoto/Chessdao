import { MongoClient } from 'mongodb'

/**
 * Shared MongoDB connection helper.
 *
 * - Caches the client on `global` so it survives Next.js hot reloads and is
 *   reused across serverless invocations instead of opening a new socket per
 *   request (the previous per-route `new MongoClient()` pattern leaked
 *   connections and added latency to every call).
 * - Includes a circuit breaker: after a failed connect we stop hammering the
 *   database for a short window and let callers fall back to in-memory storage,
 *   so a Mongo outage degrades gracefully instead of timing out every request.
 */

const MONGO_URL = process.env.MONGO_URL || ''
const DB_NAME = process.env.MONGO_DB_NAME || 'dao_chess'
const CONNECT_TIMEOUT_MS = parseInt(process.env.MONGO_TIMEOUT_MS || '3000', 10)
const BACKOFF_MS = 30_000

function cache() {
  if (!global.__chessdaoMongo) {
    global.__chessdaoMongo = { client: null, promise: null, unavailableUntil: 0 }
  }
  return global.__chessdaoMongo
}

/** True when a real (non-localhost) Mongo URL is configured. */
export function isMongoConfigured() {
  return MONGO_URL.length > 0
}

/**
 * Returns a connected `Db` instance, or `null` when Mongo is not configured or
 * is temporarily unavailable. Callers MUST handle the `null` case by falling
 * back to their in-memory store.
 */
export async function getDb() {
  if (!MONGO_URL) return null

  const c = cache()
  if (c.unavailableUntil && Date.now() < c.unavailableUntil) return null

  try {
    if (!c.client) {
      if (!c.promise) {
        const client = new MongoClient(MONGO_URL, {
          serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS,
        })
        c.promise = client.connect().then((connected) => {
          c.client = connected
          return connected
        })
      }
      await c.promise
    }
    return c.client.db(DB_NAME)
  } catch (err) {
    c.client = null
    c.promise = null
    c.unavailableUntil = Date.now() + BACKOFF_MS
    console.warn('[db] MongoDB unavailable, using in-memory fallback:', err?.message)
    return null
  }
}

export const DATABASE_NAME = DB_NAME
