import { apiFetch } from '@/api/http'

/**
 * Setup API for the Spotify Soloist extension.
 *
 * Served by soloist-bridge, not config-server, and reached through nginx's
 * /api/soloist/ drop-in rather than the config API's base URL -- so these
 * paths are origin-relative and deliberately do NOT go through
 * useAppConfigStore().getConfigApiBaseUrl().
 *
 * Spotify's Soloist binary may not be redistributed, so the package never
 * ships it: the device downloads it from Spotify on request. Everything here
 * exists to drive that one-time step and report where it got to.
 */

export interface SoloistStatus {
  binary_installed: boolean
  version: string | null
  build_date: string | null
  /** Builds expire ~90 days after they are cut; null until one is installed. */
  expires_on: string | null
  bridge_connected: boolean
  logged_in: boolean
  is_active: boolean
  device_name: string | null
}

export interface SoloistInstallState {
  running: boolean
  returncode: number | null
  output: string
}

const BASE = '/api/soloist'

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await apiFetch(`${BASE}${path}`, init)
  if (!response.ok) {
    throw new Error(`Soloist API request failed: ${response.status}`)
  }
  return response.json()
}

/** Read-only; the auth manifest puts GET /status in the "ok" tier. */
export const getSoloistStatus = () => request<SoloistStatus>('/status')

/** Starts the download and returns immediately -- poll getSoloistInstallState.
 *  "risky" tier, so this is the call that may raise the auth prompt. */
export const startSoloistInstall = () =>
  request<SoloistInstallState>('/install', { method: 'POST' })

export const getSoloistInstallState = () => request<SoloistInstallState>('/install')
