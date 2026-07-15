import { useAppConfigStore } from '@/stores/appconfig'

/** A device audiocontrol bound at startup. */
export interface BoundInputDevice {
  path: string
  name: string
  matched_keys: string[]
}

/** A device the startup scan saw but did not bind. `name` is null when the
 *  device could not be opened, so only its path is known. */
export interface UnboundInputDevice {
  path: string
  name: string | null
  reason: 'no_mapped_keys' | 'filtered_out' | 'permission_denied'
}

export interface InputLastKey {
  code: number
  name: string | null
  action: string | null
  device: string
}

export interface KeyboardInputStatus {
  enabled: boolean
  volume_step: number
  grab: boolean
  device_filter: string
  mapped_keys: number
  devices: BoundInputDevice[]
  /** Added in audiocontrol 0.8.1; absent on older devices. */
  unbound_devices?: UnboundInputDevice[]
  last_key: InputLastKey | null
}

export interface InputSource {
  name: string
  status: KeyboardInputStatus
}

export interface InputsResponse {
  inputs: InputSource[]
}

/**
 * Build inputs API URL using audiocontrol base URL
 */
const buildInputsApiUrl = (endpoint: string): string => {
  const configStore = useAppConfigStore()
  const apiBaseUrl = configStore.getApiBaseUrl()
  const url = `${apiBaseUrl}/inputs${endpoint}`
  console.log('Inputs API URL:', url)
  return url
}

/**
 * Get input device status: which devices audiocontrol bound at startup, which
 * it did not and why, and the last mapped keypress.
 *
 * Returns null when the endpoint is unavailable, which includes devices running
 * audiocontrol older than 0.8.0 where the route does not exist.
 */
export const getInputs = async (): Promise<InputsResponse | null> => {
  try {
    const url = buildInputsApiUrl('')
    const response = await fetch(url)

    if (!response.ok) {
      console.error('Failed to get inputs:', response.status, response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting inputs:', error)
    return null
  }
}
