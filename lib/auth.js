import nacl from 'tweetnacl'
import bs58 from 'bs58'
import crypto from 'crypto'

/**
 * Server-side authentication for ChessDAO API routes.
 *
 * The frontend (see `hooks/useWalletSignature.js`) already asks the user to
 * sign an action message with their Solana wallet. Until now the backend never
 * verified those signatures, so any client could POST arbitrary
 * `walletAddress` values and act as anyone. This module verifies the ed25519
 * signature and binds it to the wallet + a fresh timestamp to stop replay.
 *
 * Two guards are exported:
 *   - `requireWalletAuth`  — proves the caller controls a given wallet.
 *   - `requireOracle`      — proves the caller is the trusted game backend
 *                            (used for game resolution, which moves the pot).
 *
 * Enforcement is controlled by `AUTH_MODE`:
 *   - 'strict' — reject unverified requests (use in production).
 *   - 'warn'   — verify when credentials are present, otherwise allow but log.
 *                Lets existing clients keep working while wallet signing is
 *                rolled out. Defaults to 'warn' outside production, 'strict' in
 *                production unless overridden.
 */

const IS_PROD = process.env.NODE_ENV === 'production'
const AUTH_MODE = (process.env.AUTH_MODE || (IS_PROD ? 'strict' : 'warn')).toLowerCase()
const MAX_AGE_MS = parseInt(process.env.AUTH_MAX_AGE_MS || '300000', 10) // 5 min
const CLOCK_SKEW_MS = 60_000

const ISO_RE = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)/

/** Extract the auth triplet from request headers. */
export function readAuthHeaders(request) {
  return {
    wallet: request.headers.get('x-wallet') || '',
    signature: request.headers.get('x-signature') || '',
    message: request.headers.get('x-auth-message') || '',
  }
}

/**
 * Verify a detached ed25519 signature produced by a Solana wallet.
 * @returns {{ ok: true, wallet: string } | { ok: false, error: string }}
 */
export function verifyWalletSignature({ wallet, signature, message }) {
  if (!wallet || !signature || !message) {
    return { ok: false, error: 'missing_auth_fields' }
  }

  let pub
  try {
    pub = bs58.decode(wallet)
  } catch {
    return { ok: false, error: 'bad_wallet_encoding' }
  }
  if (pub.length !== 32) return { ok: false, error: 'bad_wallet_length' }

  let sig
  try {
    sig = Buffer.from(signature, 'base64')
  } catch {
    return { ok: false, error: 'bad_signature_encoding' }
  }
  if (sig.length !== 64) return { ok: false, error: 'bad_signature_length' }

  // The signed message must embed the full wallet address so a signature for
  // one wallet cannot be presented as auth for another.
  if (!message.includes(wallet)) {
    return { ok: false, error: 'message_not_bound_to_wallet' }
  }

  // Freshness: the message must carry an ISO timestamp within the allowed
  // window, so a captured signature cannot be replayed later.
  const match = message.match(ISO_RE)
  if (!match) return { ok: false, error: 'missing_timestamp' }
  const ts = Date.parse(match[1])
  if (Number.isNaN(ts)) return { ok: false, error: 'bad_timestamp' }
  const age = Date.now() - ts
  if (age > MAX_AGE_MS) return { ok: false, error: 'signature_expired' }
  if (age < -CLOCK_SKEW_MS) return { ok: false, error: 'signature_in_future' }

  const verified = nacl.sign.detached.verify(
    new TextEncoder().encode(message),
    new Uint8Array(sig),
    new Uint8Array(pub)
  )
  if (!verified) return { ok: false, error: 'invalid_signature' }

  return { ok: true, wallet }
}

/**
 * Guard for player actions. Confirms the caller controls a wallet and, when
 * `expectedWallet` is given, that it matches the wallet the action targets.
 *
 * @returns {{ authorized: true, wallet: string|null, verified: boolean, warn?: string }
 *          | { authorized: false, status: number, error: string }}
 */
export function requireWalletAuth(request, { expectedWallet } = {}) {
  const creds = readAuthHeaders(request)
  const result = verifyWalletSignature(creds)

  if (!result.ok) {
    if (AUTH_MODE === 'strict') {
      return { authorized: false, status: 401, error: `unauthorized:${result.error}` }
    }
    console.warn(`[auth] unverified request (${result.error}); allowed in warn mode`)
    return { authorized: true, wallet: expectedWallet || creds.wallet || null, verified: false, warn: result.error }
  }

  if (expectedWallet && result.wallet !== expectedWallet) {
    if (AUTH_MODE === 'strict') {
      return { authorized: false, status: 403, error: 'wallet_mismatch' }
    }
    console.warn('[auth] signature wallet does not match action target; allowed in warn mode')
    return { authorized: true, wallet: result.wallet, verified: true, warn: 'wallet_mismatch' }
  }

  return { authorized: true, wallet: result.wallet, verified: true }
}

/**
 * Guard for privileged server-to-server actions (game resolution). Requires a
 * shared secret in the `x-oracle-key` header, compared in constant time.
 *
 * In production the secret MUST be configured or the guard denies. Outside
 * production a missing secret is allowed (with a warning) so local dev works.
 */
export function requireOracle(request) {
  const secret = process.env.GAME_ORACLE_SECRET || ''
  const provided = request.headers.get('x-oracle-key') || ''

  if (!secret) {
    if (IS_PROD) {
      return { authorized: false, status: 503, error: 'oracle_not_configured' }
    }
    console.warn('[auth] GAME_ORACLE_SECRET not set; allowing privileged action (non-production only)')
    return { authorized: true, dev: true }
  }

  const a = Buffer.from(provided)
  const b = Buffer.from(secret)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { authorized: false, status: 403, error: 'invalid_oracle_key' }
  }
  return { authorized: true }
}

export const authMode = AUTH_MODE
