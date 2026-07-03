import { getBaseUrl } from './config'

/**
 * Client-side helpers for sending wallet-signed requests to the API.
 *
 * Pair with `hooks/useWalletSignature.js`: sign an action to get
 * `{ signature, message }`, then pass that plus the wallet address here to
 * attach the `x-wallet` / `x-signature` / `x-auth-message` headers the backend
 * (`lib/auth.js`) verifies.
 */

/** Build the auth headers from a signed action. Returns `{}` if incomplete. */
export function authHeaders({ wallet, signature, message } = {}) {
  if (!wallet || !signature || !message) return {}
  return {
    'x-wallet': wallet,
    'x-signature': signature,
    'x-auth-message': message,
  }
}

/**
 * fetch() wrapper that attaches wallet-auth headers and JSON content type.
 *
 * @param {string} endpoint - path (`/api/...`) or absolute URL
 * @param {object} options  - standard fetch options
 * @param {object} auth     - `{ wallet, signature, message }` from signAction()
 */
export async function signedFetch(endpoint, options = {}, auth = {}) {
  const baseUrl = getBaseUrl()
  const url = endpoint.startsWith('/') ? `${baseUrl}${endpoint}` : endpoint

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(auth),
      ...options.headers,
    },
  })
}
