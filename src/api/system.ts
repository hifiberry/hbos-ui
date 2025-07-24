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

// Types for Soundcard Management
export interface SoundCard {
  name: string
  dtoverlay: string
  volume_control: string | null
  output_channels: number
  input_channels: number
  features: string[]
  supports_dsp: boolean
  card_type: string[]
  is_pro: boolean
}

export interface SoundCardsResponse {
  status: 'success' | 'error'
  data: {
    soundcards: SoundCard[]
    count: number
  }
}

export interface SetDtoverlayRequest {
  dtoverlay: string
  remove_existing?: boolean
}

export interface SetDtoverlayResponse {
  status: 'success' | 'error'
  message: string
  data?: {
    dtoverlay: string
    changes_made: boolean
    reboot_required: boolean
  }
  valid_overlays?: string[]
}

// Types for System Reboot
export interface RebootRequest {
  delay?: number
}

export interface RebootResponse {
  status: 'success' | 'error'
  message: string
  data?: {
    delay: number
    scheduled: boolean
  }
  error?: string
}

// Types for Script Execution
export interface ScriptExecutionRequest {
  script: string
}

export interface ScriptExecutionResponse {
  status: 'success' | 'error'
  message: string
  data?: {
    script: string
    exit_code: number
    output?: string
    error?: string
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

/**
 * Get all available soundcards
 */
export const getSoundCards = async (): Promise<SoundCardsResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await fetch(`${baseUrl}/soundcards`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

/**
 * Set device tree overlay for soundcard
 */
export const setSoundCardDtoverlay = async (request: SetDtoverlayRequest): Promise<SetDtoverlayResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await fetch(`${baseUrl}/soundcard/dtoverlay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`)
  }

  return data
}

/**
 * Reboot the system after an optional delay
 */
export const rebootSystem = async (request?: RebootRequest): Promise<RebootResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await fetch(`${baseUrl}/system/reboot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request || {}),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`)
  }

  return data
}

/**
 * Execute a system script
 */
export const executeScript = async (request: ScriptExecutionRequest): Promise<ScriptExecutionResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await fetch(`${baseUrl}/system/scripts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`)
  }

  return data
}
