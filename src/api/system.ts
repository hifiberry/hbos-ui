import { useAppConfigStore } from '@/stores/appconfig'

// Types for System Information API
export interface SystemInfo {
  pi_model: {
    name: string
    version: string
    memory?: {
      total_kb: number
      total_mb: number
      total_gb: number
    }
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
    headphone_volume_control: string | null
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
  headphone_volume_control: string | null
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

// Types for Soundcard Detection
export interface SoundCardDetectionResponse {
  status: 'success' | 'error'
  message: string
  data?: {
    card_name: string | null
    dtoverlay: string | null
    card_detected: boolean
    definition_found: boolean
  }
  error?: string
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

// Types for Cache Statistics
export interface CacheStats {
  disk_entries: number
  memory_entries: number
  memory_bytes: number
  memory_limit_bytes: number | null
}

export interface ImageCacheStats {
  total_images: number
  total_size: number
  last_updated: number
}

export interface CacheStatsResponse {
  success: boolean
  stats: CacheStats
  image_cache_stats: ImageCacheStats
  message: string | null
}

// Types for Background Jobs
export interface BackgroundJob {
  id: string
  name: string
  start_time: number
  last_update: number
  finish_time?: number | null
  status?: 'running' | 'finished' | 'completed' | 'failed'
  progress: string | null
  total_items: number | null
  completed_items: number | null
  duration_seconds: number
  time_since_last_update: number
  completion_percentage: number | null
}

export interface BackgroundJobsResponse {
  success: boolean
  jobs: BackgroundJob[]
  message: string | null
}

// Types for File Existence Check
export interface FileExistence {
  path: string
  exists: boolean
  filename: string
}

export interface FileExistenceCheckResponse {
  status: 'success' | 'error'
  data: {
    exists: boolean
  }
  message: string
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
 * Detect the currently connected soundcard
 */
export const detectSoundCard = async (): Promise<SoundCardDetectionResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await fetch(`${baseUrl}/soundcard/detect`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`)
  }

  return data
}

/**
 * Enable or disable automatic sound card detection
 */
export const setSoundCardDetection = async (enabled: boolean): Promise<{ status: string; message: string }> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await fetch(`${baseUrl}/soundcard/detection`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ enabled }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`)
  }

  return data
}

/**
 * Get sound card detection status and configured card
 */
export const getSoundCardDetectionStatus = async (): Promise<{
  status: string
  data: {
    detection_enabled: boolean
    detection_disabled: boolean
    configured_card_name: string | null
    configured_dtoverlay: string | null
  }
}> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await fetch(`${baseUrl}/soundcard/detection`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`)
  }

  return data
}

/**
 * Disable automatic sound card detection and set a fixed sound card
 */
export const disableSoundCardDetection = async (card_name: string): Promise<SetDtoverlayResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await fetch(`${baseUrl}/soundcard/detection/disable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ card_name }),
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

  const response = await fetch(`${baseUrl}/scripts/${request.script}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`)
  }

  return data
}

/**
 * Get cache statistics
 */
export const getCacheStats = async (): Promise<CacheStatsResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getApiBaseUrl()

  const response = await fetch(`${baseUrl}/cache/stats`, {
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
 * Get background jobs list
 */
export const getBackgroundJobs = async (): Promise<BackgroundJobsResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getApiBaseUrl()

  const response = await fetch(`${baseUrl}/background/jobs`, {
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
 * Check if specific files exist on the system
 */
export const checkFileExistence = async (filePaths: string[]): Promise<FileExistence[]> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const results: FileExistence[] = []

  for (const filePath of filePaths) {
    const response = await fetch(`${baseUrl}/filesystem/file-exists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: filePath }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: FileExistenceCheckResponse = await response.json()

    // Extract filename from path
    const filename = filePath.split('/').pop() || filePath

    results.push({
      path: filePath,
      exists: data.data.exists,
      filename: filename
    })
  }

  return results
}
