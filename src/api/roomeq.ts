import { useAppConfigStore } from '@/stores/appconfig'

// RoomEQ API version requirements
export const ROOMEQ_MINIMUM_VERSION = '0.6.0'

// Pre-recorded signal constants
export const PRERECORDED_SWEEP_SIGNAL = 'sweep_10hz_22000hz_10s.wav'

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
  filename?: string // New: filename for noise files
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
  filename?: string  // Added filename support for FFT difference analysis
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
    log_frequency_summary?: {
      frequencies: number[]
      magnitudes: number[]
      points_per_octave: number
      frequency_range: [number, number]
      n_octaves: number
      n_points: number
      bin_details?: Array<{
        center_freq: number
        freq_range: [number, number]
        n_samples: number
        mean_magnitude: number
        min_magnitude: number
        max_magnitude: number
      }>
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

// FFT Difference Analysis Types
export interface RoomEQFFTDifferenceResponse {
  status: string
  comparison_info: {
    analysis_parameters: {
      fft_size: number
      window_type: string
      normalize: number | null
      points_per_octave: number
      psychoacoustic_smoothing: number | null
      analyzed_duration: number
      analyzed_samples: number
      start_time: number
    }
    file1: {
      filename: string
      peak_frequency: number
      peak_magnitude: number
      spectral_centroid: number
    }
    file2: {
      filename: string
      peak_frequency: number
      peak_magnitude: number
      spectral_centroid: number
    }
  }
  difference_analysis: {
    title: string
    description: string
    diff_type: string
    frequencies: number[]
    magnitudes: number[]
    phases: number[]
    sample_rate: number
    peak_frequency: number
    peak_magnitude: number
    source_info: {
      result1_title: string
      result2_title: string
      result1_peak_freq: number
      result2_peak_freq: number
    }
    spectral_density: {
      type: string
      description: string
      units: string
      computation: string
    }
    statistics: {
      n_points: number
      frequency_range: [number, number]
      mean_difference_db: number
      rms_difference_db: number
      max_difference_db: number
    }
  }
  individual_analyses: {
    file1_fft: {
      peak_frequency: number
      peak_magnitude: number
      spectral_centroid: number
    }
    file2_fft: {
      peak_frequency: number
      peak_magnitude: number
      spectral_centroid: number
    }
  }
}

// EQ target presets - Updated format
export interface RoomEQTargetPoint {
  frequency: number
  target_db: number
  weight: number | [number, number] | null
}

export interface RoomEQTargetCurve {
  key: string
  name: string
  description: string
  expert: boolean
  curve: RoomEQTargetPoint[]
}

export interface RoomEQTargetPresets {
  count: number
  success: true
  target_curves: RoomEQTargetCurve[]
}

export interface RoomEQOptimizerPreset {
  key: string
  preset: string
  name: string
  description: string
  qmax: number
  mindb: number
  maxdb: number
  add_highpass: boolean
}

export interface RoomEQOptimizerPresets {
  count: number
  optimizer_presets: RoomEQOptimizerPreset[]
  success: true
}

// EQ Optimization types (updated for new streaming API format)
export interface NewRoomEQMeasuredCurve {
  frequencies: number[]
  magnitudes_db: number[]
}

export interface NewRoomEQTargetCurvePoint {
  frequency: number
  target_db: number
  weight: number | [number, number] | null
}

export interface NewRoomEQTargetCurve {
  curve: NewRoomEQTargetCurvePoint[]
}

export interface NewRoomEQOptimizerParams {
  qmax: number
  mindb: number
  maxdb: number
  add_highpass: boolean
  acceptable_error: number
  min_frequency?: number
  max_frequency?: number
}

// Usable frequency range detection types
export interface RoomEQUsableRangeRequest {
  measured_curve: NewRoomEQMeasuredCurve
  optimizer_params?: {
    min_frequency?: number
    max_frequency?: number
  }
  sample_rate?: number
}

export interface RoomEQUsableRangeResult {
  success?: boolean
  usable_freq_low?: number
  usable_freq_high?: number
  recommended_min?: number
  recommended_max?: number
  min_frequency?: number
  max_frequency?: number
  analysis?: {
    low_frequency_rolloff?: number
    high_frequency_rolloff?: number
    noise_floor_estimate?: number
    dynamic_range?: number
  }
  // Allow any additional fields the server might return
  [key: string]: unknown
}

export interface NewRoomEQOptimizationRequest {
  measured_curve: NewRoomEQMeasuredCurve
  target_curve: NewRoomEQTargetCurve
  optimizer_params: NewRoomEQOptimizerParams
  sample_rate: number
  filter_count: number
}

export interface NewRoomEQOptimizedFilter {
  filter_type: 'hp' | 'eq' | 'lp'
  frequency: number
  q: number
  gain_db: number
  description: string
}

export interface NewRoomEQOptimizationResult {
  success: boolean
  filters: NewRoomEQOptimizedFilter[]
  final_error: number
  original_error: number
  improvement_db: number
  processing_time_ms: number
  error_message: string | null
  usable_freq_low: number
  usable_freq_high: number
}

// Server-Sent Event types for new streaming optimization
export interface NewRoomEQOptimizationProgress {
  type: 'started' | 'output' | 'completed'
  message: string
  line?: string
  line_number?: number
  lines_processed?: number
  processing_time?: number
  job_data?: NewRoomEQOptimizationRequest
}

/**
 * Detect usable frequency range from measured curve data
 */
export const detectUsableFrequencyRange = async (
  payload: RoomEQUsableRangeRequest
): Promise<RoomEQApiEnvelope<RoomEQUsableRangeResult>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/eq/usable-range`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    console.log('🔍 DEBUG: Usable range API response:', data)

    return {
      success: true,
      data
    }
  } catch (error) {
    console.error('Failed to detect usable frequency range:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Start EQ optimization using the new streaming Server-Sent Events API
 */
export const startNewRoomEQOptimizationStream = async (
  payload: NewRoomEQOptimizationRequest,
  onEvent: (event: NewRoomEQOptimizationProgress) => void,
  onError: (error: string) => void,
  onComplete: (result?: NewRoomEQOptimizationResult) => void
): Promise<{ success: boolean; detail?: string }> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/eq/optimize`

    console.log('Starting new streaming EQ optimization:', url, payload)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(payload),
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      throw new Error(`Failed to start optimization: ${response.status} ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('No response body for streaming')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = '' // Buffer for incomplete data
    let eventCount = 0
    const startTime = Date.now()
    let finalResult: NewRoomEQOptimizationResult | undefined

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          const duration = Date.now() - startTime
          console.log(`🏁 Stream reader completed - received ${eventCount} total events in ${duration}ms`)
          onComplete(finalResult)
          break
        }

        // Append new chunk to buffer
        const chunk = decoder.decode(value, { stream: true })
        if (chunk.length > 0) {
          console.log('Received chunk length:', chunk.length)
          buffer += chunk
        }

        // Process complete lines
        const lines = buffer.split('\n')
        // Keep the last potentially incomplete line in buffer
        buffer = lines.pop() || ''

        console.log(`Processing ${lines.length} lines from buffer`)
        for (const line of lines) {
          if (line.trim() === '') {
            continue
          }

          if (line.startsWith('data: ')) {
            try {
              const jsonData = line.substring(6).trim()
              if (jsonData) {
                const eventData = JSON.parse(jsonData) as NewRoomEQOptimizationProgress
                eventCount++
                console.log(`Optimization event #${eventCount} type:`, eventData.type, 'message:', eventData.message)

                onEvent(eventData)

                if (eventData.type === 'completed') {
                  console.log('🎯 Received completed event - parsing final result')

                  // Check if the completion event contains the final result in the line
                  if (eventData.line) {
                    try {
                      const resultData = JSON.parse(eventData.line)
                      if (resultData.success !== undefined) {
                        finalResult = resultData as NewRoomEQOptimizationResult
                        console.log('Final optimization result:', finalResult)
                      }
                    } catch (parseError) {
                      console.warn('Could not parse final result from completion event:', parseError)
                    }
                  }

                  onComplete(finalResult)
                  return { success: true }
                }
              }
            } catch (parseError) {
              console.warn('Failed to parse optimization event:', line.substring(0, 200) + '...', parseError)
            }
          } else if (line.trim() !== '' && !line.startsWith(':')) {
            console.log('Non-data line received:', line.substring(0, 100))
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    return { success: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error starting streaming optimization:', error)
    onError(errorMsg)
    return { success: false, detail: errorMsg }
  }
}

// Server-Sent Event types for streaming optimization
export interface RoomEQOptimizationFilter {
  filter_type: string
  frequency: number
  gain_db: number
  q: number
  description: string
  coefficients: {
    a: number[]
    b: number[]
  }
}

export interface RoomEQOptimizationEvent {
  type: 'started' | 'filter_added' | 'completed' | 'error'
  message?: string
  optimization_id?: string
  step?: number
  progress?: number
  timestamp?: number
  parameters?: {
    target_curve: string
    optimizer_preset: string
    filter_count: number
    sample_rate: number
    add_highpass: boolean
  }
  filter?: RoomEQOptimizationFilter
  total_filters?: number
  current_filter_set?: RoomEQOptimizationFilter[]
  frequency_response?: {
    frequencies: number[]
    magnitude_db: number[]
    phase_degrees?: number[]
  }
  error?: string
}

export interface RoomEQOptimizationStartResponse {
  status: string
  optimization_id: string
  message: string
  estimated_duration: number
  target_curve: string
  optimizer_preset: string
  filter_count: number
}

export interface RoomEQOptimizationStatusResponse {
  optimization_id: string
  status: 'optimizing' | 'completed' | 'error' | 'failed' | 'cancelled'
  progress: number
  current_step: string
  steps_completed: number
  total_steps: number
  elapsed_time: number
  estimated_remaining?: number
  current_filter?: {
    index: number
    frequency: number
    gain_db: number
    q: number
    filter_type: string
  }
  intermediate_rms_error?: number
  target_rms_error?: number
  final_rms_error?: number
  improvement_db?: number
  message?: string
}

export interface RoomEQFilter {
  index: number
  filter_type: string
  frequency: number
  q: number
  gain_db: number
  description: string
  text_format: string
  coefficients: {
    b: number[]
    a: number[]
  }
}

export interface RoomEQOptimizationResult {
  optimization_id: string
  status: string
  success: boolean
  target_curve: string
  optimizer_preset: string
  processing_time: number
  final_rms_error: number
  improvement_db: number
  filters: RoomEQFilter[]
  frequency_response: {
    frequencies: number[]
    original_response: number[]
    corrected_response: number[]
    target_response: number[]
  }
  timestamp: string
}

/**
 * Start EQ optimization using streaming Server-Sent Events API (Legacy)
 */
export const startRoomEQOptimizationStream = async (
  payload: {
    recording_id?: string
    frequencies?: number[]
    magnitudes?: number[]
    sample_rate?: number
    target_curve: string
    optimizer_preset?: string
    filter_count?: number
    intermediate_results_interval?: number
    window?: string
    points_per_octave?: number
  },
  onEvent: (event: RoomEQOptimizationEvent) => void,
  onError: (error: string) => void,
  onComplete: () => void
): Promise<{ success: boolean; detail?: string }> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/eq/optimize`

    console.log('Starting streaming RoomEQ optimization:', url, payload)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(payload),
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      throw new Error(`Failed to start optimization: ${response.status} ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('No response body for streaming')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = '' // Buffer for incomplete data
    let eventCount = 0
    const startTime = Date.now()

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          const duration = Date.now() - startTime
          console.log(`🏁 Stream reader completed - received ${eventCount} total events in ${duration}ms`)
          onComplete()
          break
        }

        // Append new chunk to buffer
        const chunk = decoder.decode(value, { stream: true })
        if (chunk.length > 0) {
          console.log('Received chunk length:', chunk.length, 'content:', chunk.substring(0, 200) + (chunk.length > 200 ? '...' : ''))
          buffer += chunk
        } else {
          console.log('Received empty chunk')
        }

        // Process complete lines
        const lines = buffer.split('\n')
        // Keep the last potentially incomplete line in buffer
        buffer = lines.pop() || ''

        console.log(`Processing ${lines.length} lines from buffer`)
        for (const line of lines) {
          if (line.trim() === '') {
            console.log('Processing empty line - skipping')
            continue
          }
          console.log('Processing line length:', line.length, 'content:', line.substring(0, 100) + (line.length > 100 ? '...' : ''))

          if (line.startsWith('data: ')) {
            try {
              const jsonData = line.substring(6).trim()
              if (jsonData) {
                console.log('Parsing JSON:', jsonData.substring(0, 200) + (jsonData.length > 200 ? '...' : ''))
                const eventData = JSON.parse(jsonData) as RoomEQOptimizationEvent
                eventCount++
                console.log(`Optimization event #${eventCount} type:`, eventData.type, 'message:', eventData.message)
                console.log('Full optimization event:', eventData)

                if (eventData.type === 'error') {
                  console.log('❌ Received error event:', eventData)
                  onError(eventData.error || eventData.message || 'Unknown optimization error')
                  return { success: false, detail: eventData.error || eventData.message }
                }

                onEvent(eventData)

                if (eventData.type === 'completed') {
                  console.log('🎯 Received completed event - calling onComplete and returning')
                  onComplete()
                  return { success: true }
                }
              }
            } catch (parseError) {
              console.warn('Failed to parse optimization event:', line.substring(0, 200) + '...', parseError)
            }
          } else if (line.trim() !== '' && !line.startsWith(':')) {
            console.log('Non-data line received:', line.substring(0, 100))
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    return { success: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error starting streaming optimization:', error)
    onError(errorMsg)
    return { success: false, detail: errorMsg }
  }
}

/**
 * Fetch optimizer presets if available
 */
export const getRoomEQOptimizerPresets = async (): Promise<RoomEQApiEnvelope<RoomEQOptimizerPresets>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/eq/presets/optimizers`

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const json: unknown = await response.json()

    if (json && typeof json === 'object' && 'optimizer_presets' in json) {
      const data = json as { optimizer_presets: unknown }
      if (Array.isArray(data.optimizer_presets)) {
        return {
          success: true,
          data: {
            count: data.optimizer_presets.length,
            optimizer_presets: data.optimizer_presets as RoomEQOptimizerPreset[],
            success: true
          }
        }
      }
    }

    // Fallback: return default preset
    return {
      success: true,
      data: {
        count: 1,
        optimizer_presets: [{
          key: 'default',
          preset: 'default',
          name: 'Default',
          description: 'Balanced optimization with moderate Q values',
          qmax: 10,
          mindb: -10,
          maxdb: 3,
          add_highpass: true
        }],
        success: true
      }
    }
  } catch (error) {
    return {
      success: false,
      data: {
        count: 1,
        optimizer_presets: [{
          key: 'default',
          preset: 'default',
          name: 'Default',
          description: 'Balanced optimization with moderate Q values',
          qmax: 10,
          mindb: -10,
          maxdb: 3,
          add_highpass: true
        }],
        success: true
      },
      detail: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Start EQ optimization using the new API with real-time progress reporting (Legacy)
 */
export const startRoomEQOptimization = async (
  payload: {
    recording_id?: string
    frequencies?: number[]
    magnitudes?: number[]
    sample_rate?: number
    target_curve: string
    optimizer_preset?: string
    filter_count?: number
    intermediate_results_interval?: number
    window?: string
    points_per_octave?: number
  }
): Promise<RoomEQApiEnvelope<RoomEQOptimizationStartResponse>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/eq/optimize/start`

    console.log('Starting RoomEQ optimization:', url, payload)

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Failed to start optimization: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ optimization start response:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error starting RoomEQ optimization:', error)
    return { success: false, detail: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Get real-time optimization progress with detailed step information
 */
export const getRoomEQOptimizationStatus = async (
  optimizationId: string
): Promise<RoomEQApiEnvelope<RoomEQOptimizationStatusResponse>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/eq/optimize/status/${encodeURIComponent(optimizationId)}`

    console.log('Getting RoomEQ optimization status:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Failed to get optimization status: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ optimization status response:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error getting RoomEQ optimization status:', error)
    return { success: false, detail: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Cancel a running optimization process
 */
export const cancelRoomEQOptimization = async (
  optimizationId: string
): Promise<RoomEQApiEnvelope<{ status: string; optimization_id: string; message: string }>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/eq/optimize/cancel/${encodeURIComponent(optimizationId)}`

    console.log('Cancelling RoomEQ optimization:', url)

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Failed to cancel optimization: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ optimization cancel response:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error cancelling RoomEQ optimization:', error)
    return { success: false, detail: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Get complete optimization results including generated EQ filters
 */
export const getRoomEQOptimizationResult = async (
  optimizationId: string
): Promise<RoomEQApiEnvelope<RoomEQOptimizationResult>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/eq/optimize/result/${encodeURIComponent(optimizationId)}`

    console.log('Getting RoomEQ optimization result:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Failed to get optimization result: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ optimization result response:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error getting RoomEQ optimization result:', error)
    return { success: false, detail: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Get available target curves for optimization
 */
export const getRoomEQOptimizationTargetCurves = async (): Promise<RoomEQApiEnvelope<string[]>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const candidates = ['/eq/presets/targets', '/eq/targets', '/eq/curves']

    let lastDetail = ''
    for (const path of candidates) {
      const url = `${apiBaseUrl}${path}`
      try {
        const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
        if (!response.ok) {
          lastDetail = `HTTP ${response.status}`
          continue
        }
        const json: unknown = await response.json()

        // Extract target curve names from response
        let curveNames: string[] = []
        if (Array.isArray(json)) {
          curveNames = json.filter(item => typeof item === 'string')
        } else if (json && typeof json === 'object') {
          const j = json as Record<string, unknown>
          if (typeof j.target_curves === 'object' && j.target_curves) {
            curveNames = Object.keys(j.target_curves as Record<string, unknown>)
          } else if (typeof j.targets === 'object' && j.targets) {
            curveNames = Object.keys(j.targets as Record<string, unknown>)
          } else {
            curveNames = Object.keys(j)
          }
        }

        if (curveNames.length) return { success: true, data: curveNames }
      } catch (err) {
        lastDetail = err instanceof Error ? err.message : 'Unknown error'
      }
    }

    // Fallback to common target curve names
    return {
      success: true,
      data: ['flat', 'weighted_flat', 'harman', 'b_k_in_room', 'diffuse_field'],
      detail: `Using fallback curves: ${lastDetail}`
    }
  } catch {
    return { success: true, data: ['flat', 'weighted_flat', 'harman'] }
  }
}

/**
 * Fetch equalisation target presets
 */
export const getRoomEQTargetPresets = async (): Promise<RoomEQApiEnvelope<RoomEQTargetPresets>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const url = `${apiBaseUrl}/eq/presets/targets`

    console.log('Getting RoomEQ target presets:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    console.log('Response status:', response.status)

    if (!response.ok) {
      throw new Error(`Failed to get target presets: ${response.status} ${response.statusText}`)
    }

    const responseText = await response.text()
    console.log('Response text (first 200 chars):', responseText.substring(0, 200))

    if (responseText.startsWith('<!DOCTYPE')) {
      throw new Error('Received HTML instead of JSON - proxy not working')
    }

    const data = JSON.parse(responseText)
    console.log('RoomEQ target presets response:', data)

    // Check if the response has the expected structure
    if (data && typeof data === 'object' && 'target_curves' in data) {
      return { success: true, data: data as RoomEQTargetPresets }
    }

    // Fallback: return default flat target
    return {
      success: true,
      data: {
        count: 1,
        success: true,
        target_curves: [{
          key: 'flat',
          name: 'Flat Response',
          description: 'Flat frequency response across all frequencies',
          expert: false,
          curve: [
            { frequency: 20, target_db: 0, weight: null },
            { frequency: 25000, target_db: 0, weight: null }
          ]
        }]
      }
    }
  } catch (error) {
    console.error('Error getting RoomEQ target presets:', error)
    return {
      success: false,
      data: {
        count: 1,
        success: true,
        target_curves: [{
          key: 'flat',
          name: 'Flat Response',
          description: 'Flat frequency response across all frequencies',
          expert: false,
          curve: [
            { frequency: 20, target_db: 0, weight: null },
            { frequency: 25000, target_db: 0, weight: null }
          ]
        }]
      },
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
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

    const responseText = await response.text()
    console.log('Version response text (first 200 chars):', responseText.substring(0, 200))

    if (responseText.startsWith('<!DOCTYPE')) {
      throw new Error('Version endpoint not proxied - received HTML instead of JSON')
    }

    const data = JSON.parse(responseText)
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
 * Compare version strings (semver-like: major.minor.patch)
 * Returns true if version1 >= version2
 */
export const isVersionAtLeast = (version1: string, version2: string): boolean => {
  const normalize = (v: string) => v.split('.').map(n => parseInt(n) || 0)
  const v1 = normalize(version1)
  const v2 = normalize(version2)

  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const n1 = v1[i] || 0
    const n2 = v2[i] || 0
    if (n1 > n2) return true
    if (n1 < n2) return false
  }
  return true
}

/**
 * Check if RoomEQ API version meets minimum requirements
 */
export const checkRoomEQVersionRequirement = async (): Promise<{ success: boolean; error?: string; currentVersion?: string }> => {
  try {
    const versionResp = await getRoomEQVersion()
    if (!versionResp.success || !versionResp.data?.version) {
      // In development mode, if version check fails due to proxy issues, allow optimization to proceed
      // but warn the user
      if (import.meta.env.DEV) {
        console.warn('Unable to verify RoomEQ API version in development mode - proceeding anyway')
        return {
          success: true,
          error: `Warning: Could not verify API version. Proceeding in development mode. ${versionResp.detail || 'Unknown error'}`,
          currentVersion: 'unknown'
        }
      }
      return { success: false, error: 'Unable to determine RoomEQ API version' }
    }

    const currentVersion = versionResp.data.version
    const isSupported = isVersionAtLeast(currentVersion, ROOMEQ_MINIMUM_VERSION)

    if (!isSupported) {
      return {
        success: false,
        error: `RoomEQ API version ${currentVersion} is not supported. Minimum required version is ${ROOMEQ_MINIMUM_VERSION}`,
        currentVersion
      }
    }

    return { success: true, currentVersion }
  } catch (error) {
    // In development mode, if version check fails, allow optimization to proceed but warn
    if (import.meta.env.DEV) {
      console.warn('Version check failed in development mode - proceeding anyway:', error)
      return {
        success: true,
        error: `Warning: Version check failed in development mode. Proceeding anyway.`,
        currentVersion: 'unknown'
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error checking API version'
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
 * Start logarithmic sine sweep(s) using SoX-based generator (if supported by the server)
 */
export const startRoomEQSweepSox = async (
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
    params.set('generator', 'sine_sox') // Use SoX-based sine generator
    const url = `${apiBaseUrl}/audio/sweep/start?${params.toString()}`

    console.log('Starting RoomEQ SoX sine sweep(s):', url)

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Failed to start SoX sine sweeps: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ SoX sine sweep start response:', data)

    return { success: true, data }
  } catch (error) {
    console.error('Error starting RoomEQ SoX sine sweeps:', error)
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
  fftSize?: number,
  pointsPerOctave?: number
): Promise<RoomEQApiEnvelope<RoomEQFFTResponse>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()
    const params = new URLSearchParams()
    params.set('window', 'hann')
    if (normalize != null) params.set('normalize', String(normalize))
    if (fftSize != null) params.set('fft_size', String(fftSize))
    if (pointsPerOctave != null) params.set('points_per_octave', String(pointsPerOctave))
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

/**
 * Analyze FFT difference between two audio sources for room response measurement
 * @param source1 - First audio source (recording ID, filename, or filepath)
 * @param source2 - Second audio source (recording ID, filename, or filepath)
 * @param source1Type - Type of first source: 'recording_id', 'filename', or 'filepath'
 * @param source2Type - Type of second source: 'recording_id', 'filename', or 'filepath'
 * @param options - Analysis options
 */
export const analyzeRoomEQFFTDifference = async (
  source1: string,
  source2: string,
  source1Type: 'recording_id' | 'filename' | 'filepath' = 'recording_id',
  source2Type: 'recording_id' | 'filename' | 'filepath' = 'recording_id',
  options: {
    pointsPerOctave?: number
    windowType?: 'hann' | 'hamming' | 'blackman' | 'rectangular'
    normalize?: number
    startAt?: number
    duration?: number
    fftSize?: number
  } = {}
): Promise<RoomEQApiEnvelope<RoomEQFFTDifferenceResponse>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()

    const params = new URLSearchParams()

    // Set the appropriate parameter names based on source types
    if (source1Type === 'recording_id') {
      params.append('recording_id1', source1)
    } else if (source1Type === 'filename') {
      params.append('filename1', source1)
    } else if (source1Type === 'filepath') {
      params.append('filepath1', source1)
    }

    if (source2Type === 'recording_id') {
      params.append('recording_id2', source2)
    } else if (source2Type === 'filename') {
      params.append('filename2', source2)
    } else if (source2Type === 'filepath') {
      params.append('filepath2', source2)
    }

    if (options.pointsPerOctave !== undefined) params.append('points_per_octave', options.pointsPerOctave.toString())
    if (options.windowType !== undefined) params.append('window', options.windowType)
    if (options.normalize !== undefined) params.append('normalize', options.normalize.toString())
    if (options.startAt !== undefined) params.append('start_at', options.startAt.toString())
    if (options.duration !== undefined) params.append('duration', options.duration.toString())
    if (options.fftSize !== undefined) params.append('fft_size', options.fftSize.toString())

    const url = `${apiBaseUrl}/audio/analyze/fft-diff?${params.toString()}`

    console.log('Performing RoomEQ FFT difference analysis:', url)

    const response = await fetch(url, { method: 'POST' })

    if (!response.ok) {
      throw new Error(`Failed to perform FFT difference analysis: ${response.status} ${response.statusText}`)
    }

    const data: RoomEQFFTDifferenceResponse = await response.json()
    console.log('RoomEQ FFT difference response:', data)

    return { success: true, data }
  } catch (error) {
    console.error('Error performing RoomEQ FFT difference analysis:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Comprehensive room measurement using noise playback, recording, and FFT difference analysis
 * @param measurementDuration - Duration for both noise and recording in seconds
 * @param amplitude - Noise amplitude (0.0-1.0)
 * @param options - Analysis options for FFT difference
 */
export const performRoomMeasurement = async (
  measurementDuration: number = 10,
  amplitude: number = 0.5,
  options: {
    pointsPerOctave?: number
    windowType?: 'hann' | 'hamming' | 'blackman' | 'rectangular'
    normalize?: number
  } = {}
): Promise<RoomEQApiEnvelope<{
  noiseFilename: string
  recordingId: string
  analysisResponse: RoomEQFFTDifferenceResponse
}>> => {
  try {
    console.log(`Starting comprehensive room measurement: ${measurementDuration}s duration, ${amplitude} amplitude`)

    // Step 1: Start noise playback
    console.log('Step 1: Starting noise playback...')
    const noiseResult = await startRoomEQNoise(amplitude, measurementDuration)
    if (!noiseResult.success || !noiseResult.data) {
      throw new Error('Failed to start noise playback')
    }

    const noiseFilename = noiseResult.data.filename || ''
    console.log(`Noise started with filename: ${noiseFilename}`)

    // Step 2: Start recording (should be started almost simultaneously)
    console.log('Step 2: Starting recording...')
    const recordingResult = await startRoomEQRecording({ duration: measurementDuration })
    if (!recordingResult.success || !recordingResult.data) {
      throw new Error('Failed to start recording')
    }

    const recordingId = recordingResult.data.recording_id.toString()
    console.log(`Recording started with ID: ${recordingId}`)

    // Step 3: Wait for recording to complete
    console.log('Step 3: Waiting for recording to complete...')
    const maxWaitTime = (measurementDuration + 5) * 1000 // Add 5 seconds buffer
    const startWait = Date.now()

    while (Date.now() - startWait < maxWaitTime) {
      const statusResult = await getRoomEQRecordingStatus(recordingId)
      if (statusResult.success && statusResult.data) {
        if (statusResult.data.state === 'completed') {
          console.log('Recording completed successfully')
          break
        } else if (statusResult.data.state === 'error') {
          throw new Error('Recording failed with error state')
        }
      }

      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Step 4: Complete the measurement with FFT difference analysis
    console.log('Step 4: Performing FFT difference analysis...')
    const measurementResult = await completeRoomMeasurement(noiseFilename, recordingId, options, measurementDuration)

    if (!measurementResult.success || !measurementResult.data) {
      throw new Error('Failed to complete FFT difference analysis')
    }

    return {
      success: true,
      data: {
        noiseFilename,
        recordingId,
        analysisResponse: measurementResult.data.analysisData
      }
    }

  } catch (error) {
    console.error('Error performing comprehensive room measurement:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Simple room measurement: start noise and recording simultaneously
 * @param measurementDuration - Duration for both noise and recording in seconds
 * @param amplitude - Noise amplitude (0.0-1.0)
 */
export const startRoomMeasurementSession = async (
  measurementDuration: number = 10,
  amplitude: number = 0.5
): Promise<RoomEQApiEnvelope<{
  noiseFilename: string
  recordingId: string
}>> => {
  try {
    console.log(`Starting room measurement session: ${measurementDuration}s duration, ${amplitude} amplitude`)

    // Start noise playback and recording simultaneously
    const [noiseResult, recordingResult] = await Promise.all([
      startRoomEQNoise(amplitude, measurementDuration),
      startRoomEQRecording({ duration: measurementDuration })
    ])

    if (!noiseResult.success || !noiseResult.data) {
      throw new Error('Failed to start noise playback')
    }

    if (!recordingResult.success || !recordingResult.data) {
      throw new Error('Failed to start recording')
    }

    const noiseFilename = noiseResult.data.filename || ''
    const recordingId = recordingResult.data.recording_id.toString()

    console.log(`Measurement session started - Noise: ${noiseFilename}, Recording: ${recordingId}`)

    return {
      success: true,
      data: {
        noiseFilename,
        recordingId
      }
    }

  } catch (error) {
    console.error('Error starting room measurement session:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Complete room measurement by analyzing FFT difference between noise source and recording
 * @param noiseFilename - Filename of the noise signal
 * @param recordingId - Recording ID of the room response
 * @param options - Analysis options
 * @param recordingDuration - Recording duration in seconds
 */
export const completeRoomMeasurement = async (
  noiseFilename: string,
  recordingId: string,
  options: {
    pointsPerOctave?: number
    windowType?: 'hann' | 'hamming' | 'blackman' | 'rectangular'
    fftSize?: number
  } = {},
  recordingDuration: number
): Promise<RoomEQApiEnvelope<{
  frequencyResponse: {
    frequencies: number[]
    magnitudes: number[]
  }
  analysisData: RoomEQFFTDifferenceResponse
}>> => {
  try {
    // Wait for the recording to complete based on known duration + buffer
    const waitTime = (recordingDuration + 1) * 1000 // Add 1 second buffer
    console.log(`Waiting ${waitTime}ms for recording ${recordingId} to complete (${recordingDuration}s + 1s buffer)`)
    await new Promise(resolve => setTimeout(resolve, waitTime))

    // Use FFT difference analysis to compare noise source with room recording
    console.log(`Analyzing room response using FFT difference: noise file "${noiseFilename}" vs recording "${recordingId}"`)

    const fftDifferenceResult = await analyzeRoomEQFFTDifference(
      noiseFilename,
      recordingId,
      'filename',
      'recording_id',
      {
        pointsPerOctave: options.pointsPerOctave || 16,
        windowType: options.windowType || 'hann',
        fftSize: options.fftSize
      }
    )

    if (!fftDifferenceResult.success || !fftDifferenceResult.data) {
      throw new Error('Failed to analyze FFT difference between noise and recording')
    }

    // Extract frequency response from FFT difference analysis
    const fftDiffData = fftDifferenceResult.data
    console.log('FFT Difference Data structure:', JSON.stringify(fftDiffData, null, 2))

    // Check if difference_analysis object exists and has required properties
    if (!fftDiffData.difference_analysis) {
      throw new Error('FFT difference response missing difference_analysis object')
    }

    if (!fftDiffData.difference_analysis.frequencies || !fftDiffData.difference_analysis.magnitudes) {
      console.error('FFT difference structure:', fftDiffData.difference_analysis)
      throw new Error('FFT difference response missing frequencies or magnitudes arrays')
    }

    const frequencies = fftDiffData.difference_analysis.frequencies
    const magnitudes = fftDiffData.difference_analysis.magnitudes

    console.log(`Room measurement completed using FFT difference - ${frequencies.length} frequency points analyzed`)

    return {
      success: true,
      data: {
        frequencyResponse: {
          frequencies,
          magnitudes
        },
        analysisData: fftDifferenceResult.data
      }
    }

  } catch (error) {
    console.error('Error completing room measurement:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Start playing a pre-recorded signal file for room measurement
 */
export const startRoomEQPrerecordedSignal = async (filename: string, amplitude: number = 0.5, repeat: number = 1, duration?: number): Promise<RoomEQApiEnvelope<RoomEQSignalResponse>> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getRoomEQApiBaseUrl()

    let url = `${apiBaseUrl}/audio/play/file?filename=${encodeURIComponent(filename)}&amplitude=${amplitude}&repeat=${repeat}`
    if (duration !== undefined) {
      url += `&duration=${duration}`
    }

    console.log('Starting RoomEQ pre-recorded signal:', filename, 'amplitude:', amplitude, 'repeat:', repeat, 'duration:', duration)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to start pre-recorded signal: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('RoomEQ pre-recorded signal response:', data)

    return {
      success: true,
      data
    }

  } catch (error) {
    console.error('Error starting RoomEQ pre-recorded signal:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
