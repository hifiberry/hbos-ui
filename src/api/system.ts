import { useAppConfigStore } from '@/stores/appconfig'

// Types for System Information API
export interface SystemInfo {
  pi_model: {
    name: string
    version: string
  }
  hat_info: {
    vendor: string
    product: string
    uuid: string
    vendor_card: string
  }
  soundcard: {
    name: string
    volume_control: string
    hardware_index: number
    output_channels: number
    input_channels: number
    features: string[]
    hat_name: string
    supports_dsp: boolean
    card_type: string[]
  }
  system: {
    uuid: string
    hostname: string
    pretty_hostname: string | null
  }
  status: 'success' | 'error'
  message?: string
  error?: string
}

// Types for Hostname API
export interface HostnameUpdateRequest {
  hostname?: string
  pretty_hostname?: string
}

export interface HostnameUpdateResponse {
  status: 'success' | 'error'
  message: string
  data?: {
    hostname: string
    pretty_hostname: string
  }
}

/**
 * Get system information including Pi model, HAT details, and system UUID
 */
export const getSystemInfo = async (): Promise<SystemInfo> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await fetch(`${baseUrl}/systeminfo`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  return data as SystemInfo
}

/**
 * Update system hostname and/or pretty hostname
 */
export const updateHostname = async (request: HostnameUpdateRequest): Promise<HostnameUpdateResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await fetch(`${baseUrl}/hostname`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}
