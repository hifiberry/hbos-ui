import { useAppConfigStore } from '@/stores/appconfig'

// Types for the Config API
export interface ConfigApiResponse<T = unknown> {
  status: 'success' | 'error'
  data?: T
  message?: string
  count?: number
}

export interface ConfigKeyValue {
  key: string
  value: string
}

export interface ConfigSetRequest {
  value: string
  secure?: boolean
}

/**
 * Get all configuration key-value pairs
 * @param prefix - Optional prefix to filter keys
 */
export const getAllConfig = async (prefix?: string): Promise<ConfigApiResponse<Record<string, string>>> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getConfigApiBaseUrl()
  const url = prefix ? `${baseUrl}?prefix=${encodeURIComponent(prefix)}` : baseUrl

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to get config: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get all configuration keys only (without values)
 * @param prefix - Optional prefix to filter keys
 */
export const getConfigKeys = async (prefix?: string): Promise<ConfigApiResponse<string[]>> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getConfigApiBaseUrl()
  const url = prefix ? `${baseUrl}/keys?prefix=${encodeURIComponent(prefix)}` : `${baseUrl}/keys`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to get config keys: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get a specific configuration value by key
 * @param key - Configuration key name
 * @param secure - Set to true for secure/encrypted values
 * @param defaultValue - Default value if key not found
 */
export const getConfigValue = async (
  key: string,
  secure?: boolean,
  defaultValue?: string
): Promise<ConfigApiResponse<ConfigKeyValue>> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getConfigApiBaseUrl()
  const params = new URLSearchParams()

  if (secure) params.append('secure', 'true')
  if (defaultValue) params.append('default', defaultValue)

  const url = `${baseUrl}/${encodeURIComponent(key)}${params.toString() ? `?${params.toString()}` : ''}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to get config value: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Set or update a configuration value
 * @param key - Configuration key name
 * @param value - The value to set
 * @param secure - Store as encrypted value
 */
export const setConfigValue = async (
  key: string,
  value: string,
  secure?: boolean
): Promise<ConfigApiResponse<ConfigKeyValue>> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getConfigApiBaseUrl()
  const url = `${baseUrl}/${encodeURIComponent(key)}`

  const requestBody: ConfigSetRequest = {
    value,
    ...(secure && { secure })
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    throw new Error(`Failed to set config value: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Update a configuration value (PUT method)
 * @param key - Configuration key name
 * @param value - The value to set
 * @param secure - Store as encrypted value
 */
export const updateConfigValue = async (
  key: string,
  value: string,
  secure?: boolean
): Promise<ConfigApiResponse<ConfigKeyValue>> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getConfigApiBaseUrl()
  const url = `${baseUrl}/${encodeURIComponent(key)}`

  const requestBody: ConfigSetRequest = {
    value,
    ...(secure && { secure })
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    throw new Error(`Failed to update config value: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Delete a configuration key and its value
 * @param key - Configuration key name
 */
export const deleteConfigValue = async (key: string): Promise<ConfigApiResponse> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getConfigApiBaseUrl()
  const url = `${baseUrl}/${encodeURIComponent(key)}`

  const response = await fetch(url, {
    method: 'DELETE'
  })

  if (!response.ok) {
    throw new Error(`Failed to delete config value: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// Convenience functions for common configuration operations

/**
 * Get volume configuration
 */
export const getVolume = async (): Promise<string | null> => {
  try {
    const response = await getConfigValue('volume')
    return response.data?.value || null
  } catch (error) {
    console.error('Failed to get volume:', error)
    return null
  }
}

/**
 * Set volume configuration
 */
export const setVolume = async (volume: string): Promise<boolean> => {
  try {
    await setConfigValue('volume', volume)
    return true
  } catch (error) {
    console.error('Failed to set volume:', error)
    return false
  }
}

/**
 * Get soundcard configuration
 */
export const getSoundcard = async (): Promise<string | null> => {
  try {
    const response = await getConfigValue('soundcard')
    return response.data?.value || null
  } catch (error) {
    console.error('Failed to get soundcard:', error)
    return null
  }
}

/**
 * Set soundcard configuration
 */
export const setSoundcard = async (soundcard: string): Promise<boolean> => {
  try {
    await setConfigValue('soundcard', soundcard)
    return true
  } catch (error) {
    console.error('Failed to set soundcard:', error)
    return false
  }
}
