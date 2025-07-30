import { useAppConfigStore } from '@/stores/appconfig'

const API_TIMEOUT = 10000
const DSP_PROFILE_DEPLOYMENT_TIMEOUT = 90000 // 90 seconds for DSP profile deployment

// Hardware Detection Types
export interface DetectedDSP {
  detected_dsp: string
  status: 'detected' | 'not_detected'
}

// Metadata Types
export interface DSPMetadata {
  checksum: string
  _system?: {
    profileName: string
    profileVersion: string
    sampleRate: number
  }
  [key: string]: unknown
}

// Program Checksum Types
export interface DSPProgramChecksumResponse {
  checksum: string
  format: 'md5'
}

// Memory Types
export interface MemoryReadResponse {
  address: string
  values: string[] | number[]
}

export interface MemoryWriteRequest {
  address: string
  value: string | number | (string | number)[]
}

export interface MemoryWriteResponse {
  address: string
  values: (string | number)[]
  status: 'success'
}

// Filter Types
export interface FilterCoefficients {
  a0: number
  a1: number
  a2: number
  b0: number
  b1: number
  b2: number
}

export interface PeakingEqFilter {
  type: 'PeakingEq'
  f: number
  db: number
  q: number
}

export interface LowPassFilter {
  type: 'LowPass'
  f: number
  db: number
  q: number
}

export interface HighPassFilter {
  type: 'HighPass'
  f: number
  db: number
  q: number
}

export interface LowShelfFilter {
  type: 'LowShelf'
  f: number
  db: number
  slope: number
  gain: number
}

export interface HighShelfFilter {
  type: 'HighShelf'
  f: number
  db: number
  slope: number
  gain: number
}

export interface VolumeFilter {
  type: 'Volume'
  db: number
}

export interface GenericBiquadFilter {
  type: 'GenericBiquad'
  a0?: number
  a1?: number
  a2?: number
  b0?: number
  b1?: number
  b2?: number
}

export type DSPFilter = PeakingEqFilter | LowPassFilter | HighPassFilter |
                       LowShelfFilter | HighShelfFilter | VolumeFilter | GenericBiquadFilter

export interface BiquadRequest {
  address: string
  offset?: number
  sampleRate?: number
  filter: DSPFilter | FilterCoefficients
}

export interface BiquadResponse {
  status: 'success'
  address: string
  sampleRate: number
  filter?: DSPFilter
  coefficients: FilterCoefficients
}

// Register Types
export interface RegisterReadResponse {
  address: string
  values: string[]
}

export interface RegisterWriteRequest {
  address: string
  value: string
}

export interface RegisterWriteResponse {
  address: string
  value: string
  status: 'success'
}

// Frequency Response Types
export interface FrequencyResponseRequest {
  filters: DSPFilter[]
  frequencies?: number[]
  pointsPerOctave?: number
}

export interface FrequencyResponseResponse {
  frequencies: number[]
  response: number[]
}

// Cache Types
export interface CacheStatus {
  profile: {
    cached: boolean
    path: string
    name: string
  }
  metadata: {
    cached: boolean
    keyCount: number
    system: {
      profileName: string
      profileVersion: string
      sampleRate: number
    }
  }
}

// Profiles Types
export interface DSPProfile {
  sampleRate: string
  profileName: string
  profileVersion: string
  programID: string
  modelName: string
  checksum: string
  _system: {
    profileName: string
    profileVersion: string
    sampleRate: number
    filename: string
    filepath: string
  }
  [key: string]: unknown
}

export interface DSPProfilesMetadataResponse {
  profiles: Record<string, DSPProfile>
  count: number
  directory: string
}

export interface DSPProfileUpdateRequest {
  xml?: string
  file?: string
  url?: string
}

export interface DSPProfileUpdateResponse {
  status: 'success'
  message: string
  checksum: {
    memory: string
    profile: string
    match: boolean
  }
}

// API Functions
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getDSPToolkitApiBaseUrl()
  const url = `${baseUrl}${endpoint}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout')
    }
    throw error
  }
}

// Long-running API request function for operations like DSP profile deployment
async function longApiRequest<T>(endpoint: string, options: RequestInit = {}, timeout: number = DSP_PROFILE_DEPLOYMENT_TIMEOUT): Promise<T> {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getDSPToolkitApiBaseUrl()
  const url = `${baseUrl}${endpoint}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout (exceeded ${timeout / 1000} seconds)`)
    }
    throw error
  }
}

// Hardware Detection API
export async function getDetectedDSP(): Promise<DetectedDSP> {
  return apiRequest<DetectedDSP>('/hardware/dsp')
}

// Metadata API
export async function getMetadata(params?: {
  start?: string
  filter?: 'biquad'
}): Promise<DSPMetadata> {
  const queryParams = new URLSearchParams()

  if (params?.start) {
    queryParams.append('start', params.start)
  }

  if (params?.filter) {
    queryParams.append('filter', params.filter)
  }

  const query = queryParams.toString()
  const endpoint = query ? `/metadata?${query}` : '/metadata'

  return apiRequest<DSPMetadata>(endpoint)
}

// Memory Access API
export async function readMemory(
  address: string,
  length?: number,
  format?: 'hex' | 'int' | 'float'
): Promise<MemoryReadResponse> {
  const queryParams = new URLSearchParams()

  if (format) {
    queryParams.append('format', format)
  }

  const query = queryParams.toString()
  const lengthPath = length ? `/${length}` : ''
  const endpoint = query
    ? `/memory/${address}${lengthPath}?${query}`
    : `/memory/${address}${lengthPath}`

  return apiRequest<MemoryReadResponse>(endpoint)
}

export async function writeMemory(request: MemoryWriteRequest): Promise<MemoryWriteResponse> {
  return apiRequest<MemoryWriteResponse>('/memory', {
    method: 'POST',
    body: JSON.stringify(request)
  })
}

// Biquad Filter API
export async function setBiquadFilter(request: BiquadRequest): Promise<BiquadResponse> {
  return apiRequest<BiquadResponse>('/biquad', {
    method: 'POST',
    body: JSON.stringify(request)
  })
}

// Register Access API
export async function readRegister(
  address: string,
  length?: number
): Promise<RegisterReadResponse> {
  const lengthPath = length ? `/${length}` : ''
  const endpoint = `/register/${address}${lengthPath}`

  return apiRequest<RegisterReadResponse>(endpoint)
}

export async function writeRegister(request: RegisterWriteRequest): Promise<RegisterWriteResponse> {
  return apiRequest<RegisterWriteResponse>('/register', {
    method: 'POST',
    body: JSON.stringify(request)
  })
}

// Frequency Response API
export async function calculateFrequencyResponse(
  request: FrequencyResponseRequest
): Promise<FrequencyResponseResponse> {
  return apiRequest<FrequencyResponseResponse>('/frequency-response', {
    method: 'POST',
    body: JSON.stringify(request)
  })
}

// Cache Management API
export async function getCacheStatus(): Promise<CacheStatus> {
  return apiRequest<CacheStatus>('/cache')
}

export async function clearCache(): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/cache/clear', {
    method: 'POST'
  })
}

export async function getDSPProfile(): Promise<string> {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getDSPToolkitApiBaseUrl()
  const response = await fetch(`${baseUrl}/dspprofile`)
  return response.text()
}

export async function updateDSPProfile(request: DSPProfileUpdateRequest): Promise<DSPProfileUpdateResponse> {
  return longApiRequest<DSPProfileUpdateResponse>('/dspprofile', {
    method: 'POST',
    body: JSON.stringify(request)
  })
}

// Profiles API
export async function getDSPProfilesMetadata(): Promise<DSPProfilesMetadataResponse> {
  return apiRequest<DSPProfilesMetadataResponse>('/profiles/metadata')
}

// Program Checksum API
export async function getDSPProgramChecksum(): Promise<DSPProgramChecksumResponse> {
  return apiRequest<DSPProgramChecksumResponse>('/checksum')
}
