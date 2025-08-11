import { useAppConfigStore } from '@/stores/appconfig'

export interface ConfigApiEnvelope<T = unknown> {
  status: 'success' | 'error'
  data?: T
  message?: string
}

export interface PipewireControlList {
  controls: string[]
  count: number
}

export interface PipewireDefaultSink {
  default_sink: string
}

export interface PipewireDefaultSource {
  default_source: string
}

export interface PipewireVolumeData {
  control: string
  volume: number // 0.0 - 1.0 linear
  volume_db: number // dB, 0 dB = max, negative values reduce volume
}

const getBaseUrls = (): { primary: string; fallback: string } => {
  const configStore = useAppConfigStore()
  const base = configStore.getConfigApiBaseUrl() // e.g. /api/config/v1
  const primary = `${base}/pipewire`
  // If base ends with /v<digit>, strip version for fallback (e.g. /api/config)
  const fallbackBase = base.replace(/\/v\d+$/i, '')
  const fallback = `${fallbackBase}/pipewire`
  return { primary, fallback }
}

async function requestWithFallback<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const { primary, fallback } = getBaseUrls()

  // Try primary
  const res1 = await fetch(`${primary}${path}`, init)
  if (res1.ok) return res1.json()
  if (res1.status !== 404) {
    throw new Error(`PipeWire API request failed: ${res1.status} ${res1.statusText}`)
  }

  // Try fallback without version
  const res2 = await fetch(`${fallback}${path}`, init)
  if (res2.ok) return res2.json()
  throw new Error(`PipeWire API fallback failed: ${res2.status} ${res2.statusText}`)
}

export const listPipewireControls = async (): Promise<ConfigApiEnvelope<PipewireControlList>> => {
  return requestWithFallback(`/controls`)
}

export const getPipewireDefaultSink = async (): Promise<ConfigApiEnvelope<PipewireDefaultSink>> => {
  return requestWithFallback(`/default-sink`)
}

export const getPipewireDefaultSource = async (): Promise<ConfigApiEnvelope<PipewireDefaultSource>> => {
  return requestWithFallback(`/default-source`)
}

export const getPipewireVolume = async (control: string = 'default'): Promise<ConfigApiEnvelope<PipewireVolumeData>> => {
  return requestWithFallback(`/volume/${encodeURIComponent(control)}`)
}

export const setPipewireVolume = async (
  control: string = 'default',
  payload: { volume?: number; volume_db?: number }
): Promise<ConfigApiEnvelope<PipewireVolumeData>> => {
  return requestWithFallback(`/volume/${encodeURIComponent(control)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export const savePipewireDefaultVolume = async (): Promise<ConfigApiEnvelope<{ setting: string; saved: boolean }>> => {
  return requestWithFallback(`/save-default-volume`, { method: 'POST' })
}
