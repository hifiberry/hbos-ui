import { useAppConfigStore } from '@/stores/appconfig'
import { apiFetch } from '@/api/http'

/** A stream announced over SAP by an AES67 transmitter (e.g. a Dante device). */
export interface Aes67Stream {
  name: string
  channels: number | null
  rate: number | null
  format: string | null
  address: string | null
  port: number | null
  source_ip: string | null
  node_id: number | null
}

export interface Aes67Status {
  stream: string | null
  sink: string | null
  receiving: boolean
  discovered: number
}

export interface Aes67Settings {
  latency_msec: number
  board_default_msec: number
  /** False when the latency follows the board default rather than a user choice. */
  overridden: boolean
  min_msec: number
  max_msec: number
  interface: string
}

const baseUrl = (): string => useAppConfigStore().getAes67ApiBaseUrl()

const readJson = async <T>(response: Response, what: string): Promise<T> => {
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`
    try {
      const body = await response.json()
      if (body?.error) detail = body.error
    } catch {
      // Non-JSON error body; the status line is all we have.
    }
    throw new Error(`Failed to ${what}: ${detail}`)
  }
  return response.json() as Promise<T>
}

export const getStreams = async (): Promise<Aes67Stream[]> => {
  const response = await apiFetch(`${baseUrl()}/streams`)
  const body = await readJson<{ streams: Aes67Stream[] }>(response, 'list AES67 streams')
  return body.streams ?? []
}

export const getStatus = async (): Promise<Aes67Status> => {
  const response = await apiFetch(`${baseUrl()}/status`)
  return readJson<Aes67Status>(response, 'read AES67 status')
}

/** Select a stream, or pass null to stop routing anything. */
export const setSelection = async (stream: string | null): Promise<void> => {
  const response = await apiFetch(`${baseUrl()}/selection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stream }),
  })
  await readJson<{ stream: string | null }>(response, 'select AES67 stream')
}

export const getSettings = async (): Promise<Aes67Settings> => {
  const response = await apiFetch(`${baseUrl()}/settings`)
  return readJson<Aes67Settings>(response, 'read AES67 settings')
}

/**
 * Set the receive latency. Pass null to follow the board default.
 *
 * Applying this regenerates the PipeWire drop-in and restarts PipeWire, which
 * briefly interrupts playback — the caller should say so before calling.
 */
export const setLatency = async (latencyMsec: number | null): Promise<Aes67Settings> => {
  const response = await apiFetch(`${baseUrl()}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latency_msec: latencyMsec }),
  })
  return readJson<Aes67Settings>(response, 'set AES67 latency')
}
