import { useAppConfigStore } from '@/stores/appconfig'

export interface ConfigApiEnvelope<T = unknown> {
  status: 'success' | 'error'
  data?: T
  message?: string
}

export interface PipewireDevices {
  count: number
  devices: {
    sinks: string[]
    sources: string[]
  }
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

export interface PipewireMixerAnalysis {
  mode: 'mono' | 'stereo' | 'swapped' | 'left' | 'right' | 'balance' | 'unknown'
  balance: number // -1.0 (full left) to +1.0 (full right), 0.0 = center
  gains: Record<string, number>
}

export interface PipewireMixerBalance {
  balance: number
  gains: Record<string, number>
}

const getBaseUrls = (): { primary: string; fallback: string } => {
  const configStore = useAppConfigStore()
  const base = configStore.getConfigApiBaseUrl() // e.g. /api/config/v1
  const primary = `${base}/pipewire`
  // Config API requires the version, so use the same base for fallback
  const fallback = `${base}/pipewire`
  return { primary, fallback }
}

async function requestWithFallback<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const { primary } = getBaseUrls()
  const fullUrl = `${primary}${path}`

  console.log('PipeWire API request:', {
    method: init?.method || 'GET',
    url: fullUrl,
    body: init?.body || 'none'
  })

  // Try the primary URL
  const res = await fetch(fullUrl, init)

  console.log('PipeWire API response:', {
    status: res.status,
    statusText: res.statusText,
    ok: res.ok
  })

  if (res.ok) {
    const data = await res.json()
    console.log('PipeWire API response data:', data)
    return data
  }

  throw new Error(`PipeWire API request failed: ${res.status} ${res.statusText}`)
}export const listPipewireDevices = async (): Promise<ConfigApiEnvelope<PipewireDevices>> => {
  return requestWithFallback(`/devices`)
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

export const getPipewireMixerAnalysis = async (): Promise<ConfigApiEnvelope<PipewireMixerAnalysis>> => {
  return requestWithFallback(`/mixer/analysis`)
}

export const getPipewireMonoStereo = async (): Promise<ConfigApiEnvelope<{ monostereo_mode: string }>> => {
  return requestWithFallback(`/monostereo`)
}

export const getPipewireBalance = async (): Promise<ConfigApiEnvelope<{ balance: number }>> => {
  return requestWithFallback(`/balance`)
}

export const setPipewireBalance = async (balance: number): Promise<ConfigApiEnvelope<{ monostereo_mode: string; balance: number }>> => {
  console.log('=== setPipewireBalance API call ===')
  console.log('Balance:', balance)

  const payload = { balance }
  console.log('Request payload:', JSON.stringify(payload))

  const result = await requestWithFallback<ConfigApiEnvelope<{ monostereo_mode: string; balance: number }>>(`/balance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  console.log('API response:', result)
  console.log('=== setPipewireBalance API call END ===')
  return result
}

export const setPipewireMixerMode = async (mode: 'mono' | 'stereo' | 'left' | 'right' | 'swapped'): Promise<ConfigApiEnvelope<{ monostereo_mode: string; balance: number }>> => {
  console.log('=== setPipewireMixerMode API call ===')
  console.log('Mode:', mode)

  const payload = { mode }
  console.log('Request payload:', JSON.stringify(payload))

  const result = await requestWithFallback<ConfigApiEnvelope<{ monostereo_mode: string; balance: number }>>(`/monostereo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  console.log('API response:', result)
  console.log('=== setPipewireMixerMode API call END ===')
  return result
}

export const setPipewireModeAndBalance = async (
  mode: 'mono' | 'stereo' | 'left' | 'right' | 'swapped',
  balance: number
): Promise<ConfigApiEnvelope<PipewireMixerAnalysis>> => {
  console.log('=== setPipewireModeAndBalance API call ===')
  console.log('Mode:', mode, 'Balance:', balance)

  // The new API separates mode and balance, so we need to call both endpoints
  try {
    // First set the mode
    const modeResult = await setPipewireMixerMode(mode)
    console.log('Mode set result:', modeResult)

    // Then set the balance
    const balanceResult = await setPipewireBalance(balance)
    console.log('Balance set result:', balanceResult)

    // Convert the response to match the expected PipewireMixerAnalysis format
    const result: ConfigApiEnvelope<PipewireMixerAnalysis> = {
      status: 'success',
      data: {
        mode: balanceResult.data?.monostereo_mode as 'mono' | 'stereo' | 'left' | 'right' | 'balance' | 'unknown' || mode,
        balance: balanceResult.data?.balance || balance,
        gains: {} // The new API doesn't return gains, but we need this for compatibility
      }
    }

    console.log('Combined result:', result)
    console.log('=== setPipewireModeAndBalance API call END ===')
    return result

  } catch (error) {
    console.error('Error in setPipewireModeAndBalance:', error)
    throw error
  }
}
