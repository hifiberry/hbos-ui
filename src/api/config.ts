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

// Types for systemd service management
export interface SystemdService {
  service: string
  permission_level: string
  allowed_operations: string[]
  active: 'active' | 'inactive' | 'failed'
  enabled: 'enabled' | 'disabled'
}

export interface SystemdServicesList {
  services: SystemdService[]
  count: number
}

export interface SystemdServiceDetails {
  service: string
  active: 'active' | 'inactive' | 'failed'
  enabled: 'enabled' | 'disabled'
  status_output: string
  status_returncode: number
  allowed_operations: string[]
}

export interface SystemdOperationResult {
  service: string
  operation: string
  output: string
  returncode: number
}

export interface SystemdServiceExists {
  service: string
  exists: boolean
}

// Network configuration types
export interface NetworkInterface {
  name: string
  mac: string
  ipv4: string | null
  netmask: string | null
  state: 'up' | 'down' | 'unknown'
  type: 'wired' | 'wireless'
}

export interface NetworkConfiguration {
  hostname: string
  default_gateway: string | null
  dns_servers: string[]
  interfaces: NetworkInterface[]
}

// I2C device types
export interface I2CDeviceInfo {
  bus_number: number
  bus_path: string
  bus_exists: boolean
  smbus2_available: boolean
  detected_devices: string[]
  kernel_used: string[]
  scan_range: string
  error?: string
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

  const url = `${baseUrl}/key/${encodeURIComponent(key)}${params.toString() ? `?${params.toString()}` : ''}`

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
  const url = `${baseUrl}/key/${encodeURIComponent(key)}`

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
  const url = `${baseUrl}/key/${encodeURIComponent(key)}`

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
  const url = `${baseUrl}/key/${encodeURIComponent(key)}`

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

// Systemd service management functions

/**
 * Get all configured systemd services and their status
 */
export const getSystemdServices = async (): Promise<ConfigApiResponse<SystemdServicesList>> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getConfigApiBaseUrl()
  const url = `${baseUrl}/systemd/services`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to get systemd services: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get detailed status of a specific systemd service
 * @param service - Service name (e.g., 'shairport', 'mpd', 'librespot')
 */
export const getSystemdServiceStatus = async (service: string): Promise<ConfigApiResponse<SystemdServiceDetails>> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getConfigApiBaseUrl()
  const url = `${baseUrl}/systemd/service/${encodeURIComponent(service)}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to get service status: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Check if a systemd service exists
 * @param service - Service name (e.g., 'shairport', 'mpd', 'librespot')
 */
export const checkSystemdServiceExists = async (service: string): Promise<ConfigApiResponse<SystemdServiceExists>> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getConfigApiBaseUrl()
  const url = `${baseUrl}/systemd/service/${encodeURIComponent(service)}/exists`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to check service existence: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Execute a systemd operation on a service
 * @param service - Service name (e.g., 'shairport', 'mpd', 'librespot')
 * @param operation - Operation to perform: 'start', 'stop', 'restart', 'enable', 'disable', 'status'
 */
export const executeSystemdOperation = async (
  service: string,
  operation: 'start' | 'stop' | 'restart' | 'enable' | 'disable' | 'enable-now' | 'disable-now' | 'status'
): Promise<ConfigApiResponse<SystemdOperationResult>> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getConfigApiBaseUrl()
  const url = `${baseUrl}/systemd/service/${encodeURIComponent(service)}/${encodeURIComponent(operation)}`

  const response = await fetch(url, {
    method: 'POST'
  })

  if (!response.ok) {
    throw new Error(`Failed to execute ${operation} on ${service}: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// Convenience functions for common systemd operations

/**
 * Enable and start a systemd service
 * @param service - Service name
 */
export const enableService = async (service: string): Promise<boolean> => {
  try {
    // First enable the service for automatic startup
    const enableResponse = await executeSystemdOperation(service, 'enable')
    if (enableResponse.status !== 'success') {
      console.error(`Failed to enable service ${service}:`, enableResponse.message)
      return false
    }

    // Then start the service immediately
    const startResponse = await executeSystemdOperation(service, 'start')
    if (startResponse.status !== 'success') {
      console.error(`Failed to start service ${service}:`, startResponse.message)
      return false
    }

    return true
  } catch (error) {
    console.error(`Failed to enable and start service ${service}:`, error)
    // Re-throw the error so the caller can handle it
    throw error
  }
}

/**
 * Stop and disable a systemd service
 * @param service - Service name
 */
export const disableService = async (service: string): Promise<boolean> => {
  try {
    // First stop the service
    const stopResponse = await executeSystemdOperation(service, 'stop')
    if (stopResponse.status !== 'success') {
      console.error(`Failed to stop service ${service}:`, stopResponse.message)
      return false
    }

    // Then disable it from automatic startup
    const disableResponse = await executeSystemdOperation(service, 'disable')
    if (disableResponse.status !== 'success') {
      console.error(`Failed to disable service ${service}:`, disableResponse.message)
      return false
    }

    return true
  } catch (error) {
    console.error(`Failed to stop and disable service ${service}:`, error)
    // Re-throw the error so the caller can handle it
    throw error
  }
}

/**
 * Enable and start a systemd service immediately
 * @param service - Service name
 */
export const enableNowService = async (service: string): Promise<boolean> => {
  try {
    const response = await executeSystemdOperation(service, 'enable-now')
    return response.status === 'success'
  } catch (error) {
    console.error(`Failed to enable-now service ${service}:`, error)
    throw error
  }
}

/**
 * Disable and stop a systemd service immediately
 * @param service - Service name
 */
export const disableNowService = async (service: string): Promise<boolean> => {
  try {
    const response = await executeSystemdOperation(service, 'disable-now')
    return response.status === 'success'
  } catch (error) {
    console.error(`Failed to disable-now service ${service}:`, error)
    throw error
  }
}

/**
 * Restart a systemd service
 * @param service - Service name
 */
export const restartService = async (service: string): Promise<boolean> => {
  try {
    const response = await executeSystemdOperation(service, 'restart')
    return response.status === 'success'
  } catch (error) {
    console.error(`Failed to restart service ${service}:`, error)
    // Re-throw the error so the caller can handle it
    throw error
  }
}

/**
 * Get the status of multiple services by name
 * @param services - Array of service names
 */
export const getMultipleServiceStatus = async (services: string[]): Promise<Map<string, SystemdServiceDetails | null>> => {
  const statusMap = new Map<string, SystemdServiceDetails | null>()

  const promises = services.map(async (service) => {
    try {
      const response = await getSystemdServiceStatus(service)
      statusMap.set(service, response.data || null)
    } catch (error) {
      console.error(`Failed to get status for service ${service}:`, error)
      statusMap.set(service, null)
    }
  })

  await Promise.all(promises)
  return statusMap
}

// Network configuration functions

/**
 * Get network configuration including interfaces, DNS, and gateway
 */
export const getNetworkConfiguration = async (): Promise<ConfigApiResponse<NetworkConfiguration>> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getConfigApiBaseUrl()
  const url = `${baseUrl}/network`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to get network configuration: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// I2C device management functions

/**
 * Scan I2C bus for connected devices
 * @param busNumber - I2C bus number to scan (default: 1, range: 0-10)
 */
export const scanI2CDevices = async (busNumber?: number): Promise<ConfigApiResponse<I2CDeviceInfo>> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getConfigApiBaseUrl()
  const params = busNumber !== undefined ? `?bus=${busNumber}` : ''
  const url = `${baseUrl}/i2c/devices${params}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to scan I2C devices: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// External player registry

export interface ExternalPlayer {
  name: string
  provided_by: string
  systemd_service: string
  icon_url: string
  allow_change: boolean
  maintainer_name: string
  maintainer_url: string
}

/**
 * Get external players registered via drop-in descriptors
 */
export const getExternalPlayers = async (): Promise<ExternalPlayer[]> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getConfigApiBaseUrl()
  const url = `${baseUrl}/players`

  try {
    const response = await fetch(url)
    if (!response.ok) return []
    const data = await response.json()
    const players: ExternalPlayer[] = data.data?.players || []
    // Rewrite icon_url to go through the config API proxy
    for (const p of players) {
      if (p.icon_url?.startsWith('/api/v1/')) {
        p.icon_url = `${baseUrl}/${p.icon_url.slice('/api/v1/'.length)}`
      }
    }
    return players
  } catch {
    return []
  }
}
