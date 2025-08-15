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
