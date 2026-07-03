import { getDb } from './db'

/**
 * Persistent, atomic game store.
 *
 * Replaces the per-route `global.gamesStorage` objects, which had two serious
 * problems:
 *   1. Each route file seeded its own copy (some with demo games, some empty),
 *      so which data you saw depended on which route JS module loaded first.
 *   2. Everything lived in memory and was lost on every restart/redeploy —
 *      including active games holding real bets.
 *
 * When Mongo is configured, state transitions (join / resolve / cancel /
 * timeout) use guarded `findOneAndUpdate` so two concurrent requests cannot,
 * for example, both join the same waiting game. When Mongo is unavailable the
 * store falls back to a single shared in-memory object (Node's single thread
 * keeps per-request mutations atomic), so development still works.
 */

const COLLECTION = 'games'
const SEED_DEMO = process.env.SEED_DEMO_GAMES !== 'false'

const OPEN_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export const GameStatus = {
  Waiting: 'waiting',
  Active: 'active',
  Completed: 'completed',
  Draw: 'draw',
  Cancelled: 'cancelled',
  Timeout: 'timeout',
}

function demoGames() {
  if (!SEED_DEMO) return []
  return [
    {
      gameId: 1,
      player1: 'DemoPlayer1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      player1Username: 'GrandMaster_Rex',
      player2: null,
      player2Username: null,
      betAmount: 150,
      totalPot: 150,
      timeControl: '5+0',
      title: 'Blitz Battle - 150 CHESS',
      status: GameStatus.Waiting,
      winner: null,
      createdAt: Date.now() - 300000,
      startedAt: null,
      endedAt: null,
      moves: [],
      fen: OPEN_FEN,
    },
    {
      gameId: 2,
      player1: 'DemoPlayer2xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      player1Username: 'ChessQueen_99',
      player2: null,
      player2Username: null,
      betAmount: 75,
      totalPot: 75,
      timeControl: '10+5',
      title: 'Rapid Match - 75 CHESS',
      status: GameStatus.Waiting,
      winner: null,
      createdAt: Date.now() - 600000,
      startedAt: null,
      endedAt: null,
      moves: [],
      fen: OPEN_FEN,
    },
  ]
}

function mem() {
  if (!global.__chessdaoGames) {
    const games = demoGames()
    global.__chessdaoGames = {
      games,
      counter: games.length + 1,
    }
  }
  return global.__chessdaoGames
}

/** Strip the Mongo `_id` field before returning documents to callers. */
function clean(doc) {
  if (!doc) return doc
  const { _id, ...rest } = doc
  return rest
}

/** Allocate the next sequential game id (atomic under Mongo). */
async function nextGameId(db) {
  if (!db) {
    const store = mem()
    return store.counter++
  }
  const res = await db.collection('counters').findOneAndUpdate(
    { _id: 'gameId' },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  )
  const seq = res?.seq ?? res?.value?.seq ?? 1
  return seq
}

export async function createGame({ player1, player1Username, betAmount, timeControl, title }) {
  const db = await getDb()
  const gameId = await nextGameId(db)
  const game = {
    gameId,
    player1,
    player1Username: player1Username || `Player_${String(player1).slice(0, 6)}`,
    player2: null,
    player2Username: null,
    betAmount,
    totalPot: betAmount,
    timeControl: timeControl || '10+0',
    title: title || `Match #${gameId} - ${betAmount} CHESS`,
    status: GameStatus.Waiting,
    winner: null,
    createdAt: Date.now(),
    startedAt: null,
    endedAt: null,
    moves: [],
    fen: OPEN_FEN,
  }

  if (!db) {
    mem().games.push(game)
    return game
  }
  await db.collection(COLLECTION).insertOne({ ...game })
  return game
}

export async function getGame(gameId) {
  const id = parseInt(gameId, 10)
  const db = await getDb()
  if (!db) {
    return mem().games.find((g) => g.gameId === id) || null
  }
  return clean(await db.collection(COLLECTION).findOne({ gameId: id }))
}

export async function listGames({ status, wallet } = {}) {
  const db = await getDb()
  let games
  if (!db) {
    games = [...mem().games]
  } else {
    const query = {}
    if (status) query.status = status
    if (wallet) query.$or = [{ player1: wallet }, { player2: wallet }]
    games = (await db.collection(COLLECTION).find(query).toArray()).map(clean)
  }

  // In-memory path filters here; Mongo already filtered above.
  if (!db) {
    if (status) games = games.filter((g) => g.status === status)
    if (wallet) games = games.filter((g) => g.player1 === wallet || g.player2 === wallet)
  }

  games.sort((a, b) => b.createdAt - a.createdAt)
  return games
}

export async function countByStatus(status) {
  const db = await getDb()
  if (!db) return mem().games.filter((g) => g.status === status).length
  return db.collection(COLLECTION).countDocuments({ status })
}

/**
 * Atomically transition a game, guarding on its current status.
 * @returns {{ ok: true, game }|{ ok: false, reason: 'not_found'|'conflict' }}
 */
export async function transition(gameId, expectedStatus, patch) {
  const id = parseInt(gameId, 10)
  const db = await getDb()

  if (!db) {
    const store = mem()
    const game = store.games.find((g) => g.gameId === id)
    if (!game) return { ok: false, reason: 'not_found' }
    if (game.status !== expectedStatus) return { ok: false, reason: 'conflict' }
    Object.assign(game, patch)
    return { ok: true, game }
  }

  const res = await db.collection(COLLECTION).findOneAndUpdate(
    { gameId: id, status: expectedStatus },
    { $set: patch },
    { returnDocument: 'after' }
  )
  const updated = res?.value ?? res
  if (!updated || !updated.gameId) {
    // Either the game does not exist or its status changed underneath us.
    const exists = await db.collection(COLLECTION).findOne({ gameId: id })
    return { ok: false, reason: exists ? 'conflict' : 'not_found' }
  }
  return { ok: true, game: clean(updated) }
}
