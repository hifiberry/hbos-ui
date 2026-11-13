import { apiFetch } from '@/api/http'

/**
 * Setup API for a player that owns a one-time installation step.
 *
 * The endpoints are served by the player's own package, not config-server, so
 * the base path comes from that player's descriptor (`setup.base_url`) rather
 * than from the config API's base URL. config-server validates it is an
 * absolute path on this device before it reaches the browser.
 *
 * The contract a provider implements:
 *   GET  <base>/status   -> PlayerSetupStatus
 *   POST <base>/install  -> starts the job, returns immediately
 *   GET  <base>/install  -> PlayerSetupInstallState, poll until running=false
 *
 * Optional sign-in flow, announced by `sign_in` in the status response
 * (providers without it are unaffected):
 *   POST   <base>/login   -> { code, expires_in }, or 4xx/5xx { error }
 *   GET    <base>/login   -> PlayerSignInState, poll until it leaves 'waiting'
 *   DELETE <base>/login   -> cancels a pending code
 *   POST   <base>/logout  -> removes the stored credentials
 * The provider never sends a token.
 *
 * Spotify Soloist is the case this exists for: its binary may not be
 * redistributed, so the device fetches it from Spotify on request.
 */

export interface PlayerSetupStatus {
  binary_installed: boolean
  version: string | null
  build_date: string | null
  /** Some builds expire; null when the provider has no such notion. */
  expires_on: string | null
  bridge_connected: boolean
  logged_in: boolean
  is_active: boolean
  device_name: string | null
  /** Present when the provider has a sign-in flow of its own. */
  sign_in?: PlayerSetupSignIn
}

export interface PlayerSetupSignIn {
  method: 'quick_connect'
  /** Signed-in account, null when signed out. */
  account: string | null
  server_name: string | null
  /** false when a prerequisite is missing; `reason` says which. */
  ready: boolean
  reason?: string | null
  /** Signed in, but on another server than the one selected (logged_in is
   *  false). `account` and `server_name` then name that sign-in, which the
   *  player still uses until it is signed out. */
  other_server?: boolean
}

export interface PlayerSignInState {
  state: 'idle' | 'waiting' | 'approved' | 'expired' | 'failed'
  code: string | null
  error: string | null
}

export interface PlayerSetupInstallState {
  running: boolean
  returncode: number | null
  output: string
}

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await apiFetch(url, init)
  if (!response.ok) {
    throw new Error(await errorMessage(response))
  }
  return response.json()
}

/** Providers explain failures as `{"error": "..."}`; prefer that text. */
const errorMessage = async (response: Response): Promise<string> => {
  try {
    const body = await response.json()
    if (body && typeof body.error === 'string' && body.error) return body.error
  } catch {
    // no JSON body; fall through
  }
  return `Setup API request failed: ${response.status}`
}

const send = async (url: string, init: RequestInit): Promise<void> => {
  const response = await apiFetch(url, init)
  if (!response.ok) throw new Error(await errorMessage(response))
}

/** Read-only; providers put this in the auth gateway's "ok" tier. */
export const getSetupStatus = (baseUrl: string) =>
  request<PlayerSetupStatus>(`${baseUrl}/status`)

/** Starts the job and returns immediately -- poll getSetupInstallState.
 *  "risky" tier, so this is the call that may raise the auth prompt. */
export const startSetupInstall = (baseUrl: string) =>
  request<PlayerSetupInstallState>(`${baseUrl}/install`, { method: 'POST' })

export const getSetupInstallState = (baseUrl: string) =>
  request<PlayerSetupInstallState>(`${baseUrl}/install`)

/** "risky" tier: may raise the auth prompt. */
export const startSignIn = (baseUrl: string) =>
  request<{ code: string; expires_in: number }>(`${baseUrl}/login`, { method: 'POST' })

export const getSignInState = (baseUrl: string) =>
  request<PlayerSignInState>(`${baseUrl}/login`)

export const cancelSignIn = (baseUrl: string) =>
  send(`${baseUrl}/login`, { method: 'DELETE' })

export const signOut = (baseUrl: string) =>
  send(`${baseUrl}/logout`, { method: 'POST' })
