/** Config-server route that reports and chooses the audio server. */
import { useAppConfigStore } from '@/stores/appconfig'
import { apiFetch } from '@/api/http'
import type { ApiError } from '@/api/pipewire'

export type AudioServerName = 'pipewire' | 'aas'

export interface AudioServerInfo {
  running: AudioServerName
  chosen: AudioServerName
  available: boolean
}

export interface AudioServerChoice extends AudioServerInfo {
  reboot_required: boolean
  warnings: string[]
}

async function call<T>(init?: RequestInit, path = ''): Promise<T | ApiError> {
  try {
    const base = useAppConfigStore().getConfigApiBaseUrl()
    const response = await apiFetch(`${base}/audio-server${path}`, init)
    let body: { status?: string; data?: T; message?: string } | null = null
    try {
      body = await response.json()
    } catch {
      body = null
    }
    if (!response.ok || !body || body.status === 'error' || body.data === undefined) {
      return {
        error: `HTTP ${response.status}`,
        message: body?.message ?? `HTTP ${response.status}`,
      }
    }
    return body.data
  } catch (error) {
    return {
      error: 'Network Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** The route answers fast or not at all; a slow one must not hold up start-up. */
const LOAD_TIMEOUT_MS = 3000

export const getAudioServer = () =>
  call<AudioServerInfo>({ signal: AbortSignal.timeout(LOAD_TIMEOUT_MS) })

export const setAudioServer = (server: AudioServerName) =>
  call<AudioServerChoice>({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ server }),
  })

/** The latency the config server keeps for aas; `null` leaves it to aas's own default. */
export interface AasLatencySetting {
  latency_ms: number | null
}

export const getAasLatency = () =>
  call<AasLatencySetting>({ signal: AbortSignal.timeout(LOAD_TIMEOUT_MS) }, '/aas-settings')

/** `restarted` says whether aas was restarted to apply it. */
export const setAasLatency = (latency_ms: number | null) =>
  call<AasLatencySetting & { restarted: boolean }>(
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latency_ms }),
    },
    '/aas-settings',
  )
