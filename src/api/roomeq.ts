import { useAppConfigStore } from '@/stores/appconfig'

export interface RoomEQApiEnvelope<T = unknown> {
  success?: boolean
  detail?: string
  data?: T
}

export interface RoomEQMicrophone {
  card_index: number
  device_name: string
  sensitivity: number
  sensitivity_str: string
  gain_db: number
}

export interface RoomEQMicrophonesRaw {
  microphones: string[]
}

export interface RoomEQAudioInputs {
  input_cards: number[]
  count: number
}

export interface RoomEQAudioCards {
  cards: string[]
  count: number
}

export interface RoomEQApiInfo {
  message: string
  version: string
  description: string
  endpoints: {
    info: string[]
    microphones: string[]
    audio_devices: string[]
    measurements: string[]
    signal_generation: string[]
  }
  usage: Record<string, string>
}

export interface RoomEQVersionInfo {
  version: string
  api_name: string
  features: string[]
}

export interface RoomEQNoiseStatus {
  active: boolean
  signal_type?: 'noise' | 'sine_sweep'
  amplitude: number
  device: string
  remaining_seconds: number
  stop_time: string
  // Sweep-specific optional fields
  start_freq?: number
  end_freq?: number
  sweeps?: number
  duration?: number
  sweep_duration?: number
  total_duration?: number
}

export interface RoomEQSignalResponse {
  message: string
  status: string
  volume?: number
  duration?: number
  amplitude?: number
  device?: string
  stop_time?: string
  new_stop_time?: string
}

export interface RoomEQSPLMeasurement {
  spl_db: number
  timestamp: string
  microphone?: string
  status: string
}

export interface RoomEQSweepStartResponse {
  status: string
  signal_type: 'sine_sweep'
  start_freq: number
  end_freq: number
  duration: number
  sweeps: number
  total_duration: number
  amplitude: number
  device: string
  stop_time: string
  message?: string
}

// Recording types
export interface RoomEQRecordingStartResponse {
  status: string
  recording_id: string | number
  filename: string
  duration: number
  device?: string
  message?: string
}

export interface RoomEQRecordingStatusResponse {
  status: string
  recording_id: string | number
  state: 'idle' | 'recording' | 'completed' | 'error'
  remaining_seconds?: number
  stop_time?: string
  filename?: string
  message?: string
}

// FFT analysis types
export interface RoomEQFFTResponse {
  status: string
  recording_info?: {
    recording_id: string
    filename: string
    original_duration: number
    original_device: string
    original_sample_rate: number
    timestamp: string
  }
  analysis_info?: {
    analyzed_duration: number
    analyzed_samples: number
    start_time: number
  }
  fft_analysis: {
    fft_size: number
    window_type: string
    sample_rate: number
    frequency_resolution: number
    frequencies: number[]
    magnitudes: number[]
    phases: number[]
    peak_frequency: number
    peak_magnitude: number
    spectral_centroid: number
    frequency_bands: {
      sub_bass: { range: string; avg_magnitude: number; peak_frequency: number }
      bass: { range: string; avg_magnitude: number; peak_frequency: number }
      low_midrange: { range: string; avg_magnitude: number; peak_frequency: number }
      midrange: { range: string; avg_magnitude: number; peak_frequency: number }
      upper_midrange: { range: string; avg_magnitude: number; peak_frequency: number }
      presence: { range: string; avg_magnitude: number; peak_frequency: number }
      brilliance: { range: string; avg_magnitude: number; peak_frequency: number }
    }
    normalization: {
      applied: boolean
      requested_freq?: number
      actual_freq?: number
      reference_level_db?: number
    }
  }
  analysis_timestamp: string
}

/**
 * Get RoomEQ API information and endpoint overview
 */
export const getRoomEQInfo = async (): Promise<RoomEQApiEnvelope<RoomEQApiInfo>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/`

    console.log('Getting RoomEQ API info:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get RoomEQ info: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ API info response:', data)

    return {
      success: true,
      data
    }

  } catch (error) {
    console.error('Error getting RoomEQ info:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Get RoomEQ API version information
 */
export const getRoomEQVersion = async (): Promise<RoomEQApiEnvelope<RoomEQVersionInfo>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/version`

    console.log('Getting RoomEQ version info:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get RoomEQ version: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ version response:', data)

    return {
      success: true,
      data
    }

  } catch (error) {
    console.error('Error getting RoomEQ version:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Get detected microphones with detailed properties
 */
export const getRoomEQMicrophones = async (): Promise<RoomEQApiEnvelope<RoomEQMicrophone[]>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/microphones`

    console.log('Getting RoomEQ microphones:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get microphones: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ microphones response:', data)

    return {
      success: true,
      data
    }

  } catch (error) {
    console.error('Error getting RoomEQ microphones:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Get microphones in raw format (bash script compatible)
 */
export const getRoomEQMicrophonesRaw = async (): Promise<RoomEQApiEnvelope<RoomEQMicrophonesRaw>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/microphones/raw`

    console.log('Getting RoomEQ raw microphones:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get raw microphones: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ raw microphones response:', data)

    return {
      success: true,
      data
    }

  } catch (error) {
    console.error('Error getting RoomEQ raw microphones:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Get available audio input cards
 */
export const getRoomEQAudioInputs = async (): Promise<RoomEQApiEnvelope<RoomEQAudioInputs>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/audio/inputs`

    console.log('Getting RoomEQ audio inputs:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get audio inputs: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ audio inputs response:', data)

    return {
      success: true,
      data
    }

  } catch (error) {
    console.error('Error getting RoomEQ audio inputs:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Get all available ALSA audio cards
 */
export const getRoomEQAudioCards = async (): Promise<RoomEQApiEnvelope<RoomEQAudioCards>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/audio/cards`

    console.log('Getting RoomEQ audio cards:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get audio cards: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ audio cards response:', data)

    return {
      success: true,
      data
    }

  } catch (error) {
    console.error('Error getting RoomEQ audio cards:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Start playing white noise for room measurement
 */
export const startRoomEQNoise = async (amplitude: number = 0.5, duration: number = 3.0): Promise<RoomEQApiEnvelope<RoomEQSignalResponse>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/audio/noise/start?duration=${duration}&amplitude=${amplitude}`

    console.log('Starting RoomEQ white noise:', url, 'amplitude:', amplitude, 'duration:', duration)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to start white noise: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ start noise response:', data)

    return {
      success: true,
      data
    }

  } catch (error) {
    console.error('Error starting RoomEQ white noise:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Stop playing white noise
 */
export const stopRoomEQNoise = async (): Promise<RoomEQApiEnvelope<RoomEQSignalResponse>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/audio/noise/stop`

    console.log('Stopping RoomEQ white noise:', url)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to stop white noise: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ stop noise response:', data)

    return {
      success: true,
      data
    }

  } catch (error) {
    console.error('Error stopping RoomEQ white noise:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Keep playing white noise (extend playback duration)
 */
export const keepRoomEQNoisePlaying = async (duration: number = 3.0): Promise<RoomEQApiEnvelope<RoomEQSignalResponse>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/audio/noise/keep-playing?duration=${duration}`

    console.log('Extending RoomEQ white noise playback:', url, 'duration:', duration)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to extend white noise playback: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ keep playing response:', data)

    return {
      success: true,
      data
    }

  } catch (error) {
    console.error('Error extending RoomEQ white noise playback:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Get white noise playback status
 */
export const getRoomEQNoiseStatus = async (): Promise<RoomEQApiEnvelope<RoomEQNoiseStatus>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/audio/noise/status`

    console.log('Getting RoomEQ noise status:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get noise status: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ noise status response:', data)

    return {
      success: true,
      data
    }

  } catch (error) {
    console.error('Error getting RoomEQ noise status:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Start logarithmic sine sweep(s)
 */
export const startRoomEQSweep = async (
  options?: {
    startFreq?: number
    endFreq?: number
    duration?: number
    sweeps?: number
    amplitude?: number
    device?: string
  }
): Promise<RoomEQApiEnvelope<RoomEQSweepStartResponse>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const params = new URLSearchParams()
    if (options?.startFreq != null) params.set('start_freq', String(options.startFreq))
    if (options?.endFreq != null) params.set('end_freq', String(options.endFreq))
    if (options?.duration != null) params.set('duration', String(options.duration))
    if (options?.sweeps != null) params.set('sweeps', String(options.sweeps))
    if (options?.amplitude != null) params.set('amplitude', String(options.amplitude))
    if (options?.device) params.set('device', options.device)
    const url = `${apiBaseUrl}/audio/sweep/start?${params.toString()}`

    console.log('Starting RoomEQ sine sweep(s):', url)

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Failed to start sine sweeps: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ sine sweep start response:', data)

    return { success: true, data }
  } catch (error) {
    console.error('Error starting RoomEQ sine sweeps:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Start a recording job
 */
export const startRoomEQRecording = async (
  options: {
    duration: number
    sampleRate?: number
    device?: string
    filenameHint?: string
  }
): Promise<RoomEQApiEnvelope<RoomEQRecordingStartResponse>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const params = new URLSearchParams()
    params.set('duration', String(options.duration))
    if (options.sampleRate != null) params.set('sample_rate', String(options.sampleRate))
    if (options.device) params.set('device', options.device)
    if (options.filenameHint) params.set('filename', options.filenameHint)
    const url = `${apiBaseUrl}/audio/record/start?${params.toString()}`

    console.log('Starting RoomEQ recording:', url)

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Failed to start recording: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ recording start response:', data)

    return { success: true, data }
  } catch (error) {
    console.error('Error starting RoomEQ recording:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Get recording status by ID
 */
export const getRoomEQRecordingStatus = async (
  recordingId: string | number
): Promise<RoomEQApiEnvelope<RoomEQRecordingStatusResponse>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/audio/record/status/${encodeURIComponent(String(recordingId))}`

    console.log('Getting RoomEQ recording status:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Failed to get recording status: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ recording status response:', data)

    return { success: true, data }
  } catch (error) {
    console.error('Error getting RoomEQ recording status:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Set pink noise volume (deprecated - use amplitude in start call)
 */
export const setRoomEQNoiseVolume = async (volume: number): Promise<RoomEQApiEnvelope<RoomEQSignalResponse>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/signal/pink-noise/volume`

    console.log('Setting RoomEQ noise volume:', url, 'volume:', volume)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ volume })
    })

    if (!response.ok) {
      throw new Error(`Failed to set noise volume: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ set volume response:', data)

    return {
      success: true,
      data
    }

  } catch (error) {
    console.error('Error setting RoomEQ noise volume:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Measure current SPL (Sound Pressure Level) in dB
 */
export const measureRoomEQSPL = async (): Promise<RoomEQApiEnvelope<RoomEQSPLMeasurement>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/spl/measure`

    console.log('Measuring RoomEQ SPL:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to measure SPL: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ SPL measurement response:', data)

    return {
      success: true,
      data
    }

  } catch (error) {
    console.error('Error measuring RoomEQ SPL:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Perform FFT analysis on a recorded wave file by recording ID
 */
export const analyzeRoomEQFFTRecording = async (
  recordingId: string | number,
  normalize?: number,
  fftSize?: number
): Promise<RoomEQApiEnvelope<RoomEQFFTResponse>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const params = new URLSearchParams()
    params.set('window', 'hann')
    if (normalize != null) params.set('normalize', String(normalize))
    if (fftSize != null) params.set('fft_size', String(fftSize))
    const url = `${apiBaseUrl}/audio/analyze/fft-recording/${encodeURIComponent(String(recordingId))}?${params.toString()}`

    console.log('Performing RoomEQ FFT analysis on recording:', url)

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Failed to perform FFT analysis: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ FFT analysis response:', data)

    return { success: true, data }
  } catch (error) {
    console.error('Error performing RoomEQ FFT analysis:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
