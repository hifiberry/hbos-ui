import { useAppConfigStore } from '@/stores/appconfig'

export interface VolumeInfo {
  available: boolean
  control_info?: {
    internal_name: string
    display_name: string
    decibel_range?: {
      min_db: number
      max_db: number
    }
  }
  current_state?: {
    percentage: number
    decibels?: number
    raw_value?: number
  }
  supports_change_monitoring: boolean
}

export interface VolumeState {
  percentage: number
  decibels?: number
  raw_value?: number
}

export interface VolumeResponse {
  success: boolean
  message: string
  new_state: VolumeState | null
}

/**
 * Build volume API URL using audiocontrol base URL
 */
const buildVolumeApiUrl = (endpoint: string): string => {
  const configStore = useAppConfigStore()
  const apiBaseUrl = configStore.getApiBaseUrl()
  const url = `${apiBaseUrl}/volume${endpoint}`
  console.log('Volume API URL:', url)
  return url
}

/**
 * Get volume information including current state and capabilities
 */
export const getVolumeInfo = async (): Promise<VolumeInfo | null> => {
  try {
    const url = buildVolumeApiUrl('/info')
    const response = await fetch(url)

    if (!response.ok) {
      console.error('Failed to get volume info:', response.status, response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting volume info:', error)
    return null
  }
}

/**
 * Get current volume state
 */
export const getVolumeState = async (): Promise<VolumeState | null> => {
  try {
    const url = buildVolumeApiUrl('/state')
    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 503) {
        console.warn('Volume control not available')
        return null
      }
      console.error('Failed to get volume state:', response.status, response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting volume state:', error)
    return null
  }
}

/**
 * Set volume level using percentage
 */
export const setVolumeLevel = async (percentage: number): Promise<VolumeResponse | null> => {
  try {
    if (percentage < 0 || percentage > 100) {
      throw new Error(`Volume percentage ${percentage} is out of range (0-100)`)
    }

    const url = buildVolumeApiUrl('/set')
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        percentage: Math.round(percentage * 100) / 100 // Round to 2 decimal places
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      console.error('Failed to set volume:', response.status, errorData.message || response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error setting volume:', error)
    return null
  }
}

/**
 * Increase volume by specified amount (default 5%)
 */
export const increaseVolume = async (amount: number = 5.0): Promise<VolumeResponse | null> => {
  try {
    const url = buildVolumeApiUrl(`/increase?amount=${amount}`)
    const response = await fetch(url, {
      method: 'POST'
    })

    if (!response.ok) {
      console.error('Failed to increase volume:', response.status, response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error increasing volume:', error)
    return null
  }
}

/**
 * Decrease volume by specified amount (default 5%)
 */
export const decreaseVolume = async (amount: number = 5.0): Promise<VolumeResponse | null> => {
  try {
    const url = buildVolumeApiUrl(`/decrease?amount=${amount}`)
    const response = await fetch(url, {
      method: 'POST'
    })

    if (!response.ok) {
      console.error('Failed to decrease volume:', response.status, response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error decreasing volume:', error)
    return null
  }
}

/**
 * Toggle mute (switches between 0% and 50% volume)
 */
export const toggleMute = async (): Promise<VolumeResponse | null> => {
  try {
    const url = buildVolumeApiUrl('/mute')
    const response = await fetch(url, {
      method: 'POST'
    })

    if (!response.ok) {
      console.error('Failed to toggle mute:', response.status, response.statusText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error toggling mute:', error)
    return null
  }
}
