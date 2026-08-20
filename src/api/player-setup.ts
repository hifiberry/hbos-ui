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
}

export interface PlayerSetupInstallState {
  running: boolean
  returncode: number | null
  output: string
}

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await apiFetch(url, init)
  if (!response.ok) {
    throw new Error(`Setup API request failed: ${response.status}`)
  }
  return response.json()
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
