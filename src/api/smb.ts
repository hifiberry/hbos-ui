import { useAppConfigStore } from '@/stores/appconfig'

// Types for SMB/CIFS API
export interface SmbServer {
  ip: string
  name: string
  hostname: string
  is_file_server: boolean
  services: string[]
  local_network: string
  interface: string
}

export interface SmbServersResponse {
  status: 'success' | 'error'
  data: {
    servers: SmbServer[]
    count: number
  }
  message?: string
}

export interface SmbShare {
  name: string
  type: string
  comment: string
}

export interface SmbSharesResponse {
  status: 'success' | 'error'
  data: {
    server: string
    shares: SmbShare[]
    count: number
  }
  message?: string
}

export interface SmbMount {
  id: number
  server: string
  share: string
  mountpoint: string
  user: string
  version: string
  options: string
  mounted: boolean
}

export interface SmbMountsResponse {
  status: 'success' | 'error'
  data: {
    mounts: SmbMount[]
    count: number
    summary: {
      total: number
      mounted: number
      unmounted: number
    }
  }
  message?: string
}

export interface SmbTestResponse {
  status: 'success' | 'error'
  data: {
    server: string
    connected: boolean
    message?: string
    error?: string
  }
  message?: string
}

export interface SmbMountRequest {
  action?: 'add' | 'remove' // Optional since it's added by the API functions
  server: string
  share: string
  mountpoint?: string
  user?: string
  password?: string
  version?: string
  options?: string
  uid?: number
  gid?: number
  file_mode?: string
  dir_mode?: string
}

export interface SmbMountResponse {
  status: 'success' | 'error'
  message: string
  data?: {
    id?: number
    server: string
    share: string
    mountpoint: string
    mounted?: boolean
    unmounted?: boolean
    command?: string
    output?: string
    error_details?: string
    // New fields for mount-all response
    service?: string
    action?: string
    configurations?: Array<{
      server: string
      share: string
      mountpoint: string
      id: number
    }>
    count?: number
    note?: string
    warning?: string
    mpd_reconcile?: {
      service: string
      status: 'success' | 'error'
      message: string
      details?: string
      return_code?: number
    }
  }
  error?: string
}

export interface SmbDiagnosticsResponse {
  status: 'success' | 'error'
  data: {
    mount_id: number
    server: string
    share: string
    mountpoint: string
    mounted: boolean
    mount_command: string
    mount_output: string
    mount_error?: string
    system_info: {
      cifs_available: boolean
      mount_capabilities: string[]
      user_id: number
      group_id: number
    }
  }
  message?: string
}

export interface SmbCapabilitiesResponse {
  status: 'success' | 'error'
  data: {
    cifs_utils_installed: boolean
    mount_cifs_available: boolean
    supported_versions: string[]
    required_capabilities: string[]
    current_user: {
      uid: number
      gid: number
      groups: string[]
    }
    recommendations: string[]
  }
  message?: string
}

/**
 * Parse SMB API error response and return user-friendly error message
 */
const parseSmbError = (response: Record<string, unknown>, defaultMessage: string): string => {
  // If the response has a detailed error message, use it
  if (response.data && typeof response.data === 'object' && response.data !== null) {
    const data = response.data as Record<string, unknown>
    if (data.error_details && typeof data.error_details === 'string') {
      return data.error_details
    }
  }

  // If the response has an error field, use it
  if (response.error && typeof response.error === 'string') {
    return response.error
  }

  // Use the main message field
  if (response.message && typeof response.message === 'string') {
    return response.message
  }

  return defaultMessage
}

/**
 * Handle HTTP error responses and return meaningful error messages
 */
const handleHttpError = async (response: Response, operation: string): Promise<never> => {
  let errorMessage = `${operation} failed`

  try {
    const errorData = await response.json()

    switch (response.status) {
      case 400:
        errorMessage = `Bad request: ${parseSmbError(errorData, 'Missing or invalid parameters')}`
        break
      case 403:
        errorMessage = `Access denied: ${parseSmbError(errorData, 'Operation not permitted')}`
        break
      case 404:
        errorMessage = `Not found: ${parseSmbError(errorData, 'Resource not found')}`
        break
      case 500:
        errorMessage = `Server error: ${parseSmbError(errorData, 'Internal server error occurred')}`
        break
      default:
        errorMessage = `${operation} failed: ${parseSmbError(errorData, `HTTP ${response.status}`)}`
    }
  } catch {
    // If we can't parse the error response, use the status code
    errorMessage = `${operation} failed with HTTP ${response.status}`
  }

  throw new Error(errorMessage)
}

/**
 * Create safe mount options for SMB/CIFS mounting
 * This helps avoid capability issues by using appropriate mount options
 * This helps avoid capability issues by using appropriate mount options
 */
export const createSafeMountOptions = (
  username?: string,
  uid?: number,
  gid?: number,
  fileMode?: string,
  dirMode?: string
): string => {
  const options = []

  // Basic options to avoid capability issues
  options.push('rw') // Read-write access
  options.push('file_mode=' + (fileMode || '0644')) // File permissions
  options.push('dir_mode=' + (dirMode || '0755')) // Directory permissions

  // User and group mapping
  if (uid !== undefined) {
    options.push(`uid=${uid}`)
  } else {
    options.push('uid=1000') // Default to user 1000 (usually first user)
  }

  if (gid !== undefined) {
    options.push(`gid=${gid}`)
  } else {
    options.push('gid=1000') // Default to group 1000
  }

  // Username if provided
  if (username) {
    options.push(`username=${username}`)
  }

  // Additional options to prevent capability issues
  options.push('nobrl') // Disable byte range locking
  options.push('cache=loose') // Use loose caching
  options.push('iocharset=utf8') // UTF-8 character set
  options.push('vers=3.0') // Use SMB 3.0 by default

  return options.join(',')
}

/**
 * Discover SMB/CIFS file servers on the local network
 */
export const getSmbServers = async (): Promise<SmbServersResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await fetch(`${baseUrl}/smb/servers`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    await handleHttpError(response, 'Get SMB servers')
  }

  return await response.json()
}

/**
 * Test connection to a specific SMB server
 */
export const testSmbServer = async (
  server: string,
  username?: string,
  password?: string
): Promise<SmbTestResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const requestBody: {
    server: string
    username?: string
    password?: string
  } = {
    server: server
  }

  if (username) {
    requestBody.username = username
  }

  if (password) {
    requestBody.password = password
  }

  const response = await fetch(`${baseUrl}/smb/test/${encodeURIComponent(server)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    await handleHttpError(response, 'Test SMB server connection')
  }

  const result = await response.json()

  // The API can return HTTP 200 with status: "error" in the response body
  if (result.status === 'error') {
    // Return the error response so the UI can display the error message
    return result
  }

  return result
}

/**
 * List available shares on a specific SMB server
 */
export const getSmbShares = async (
  server: string,
  username?: string,
  password?: string,
  detailed?: boolean
): Promise<SmbSharesResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const requestBody: {
    server: string
    username?: string
    password?: string
    detailed?: boolean
  } = {
    server: server
  }

  if (username) {
    requestBody.username = username
  }

  if (password) {
    requestBody.password = password
  }

  if (detailed) {
    requestBody.detailed = detailed
  }

  const response = await fetch(`${baseUrl}/smb/shares`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    await handleHttpError(response, 'Get SMB shares')
  }

  return await response.json()
}

/**
 * List all configured SMB mount points for music access
 */
export const getSmbMounts = async (): Promise<SmbMountsResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await fetch(`${baseUrl}/smb/mounts`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    await handleHttpError(response, 'Get SMB mounts')
  }

  return await response.json()
}

/**
 * Add an SMB share configuration (does not mount it)
 * Use mountAllSmbShares() afterward to mount all configured shares
 */
export const mountSmbShare = async (mountRequest: SmbMountRequest): Promise<SmbMountResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const requestWithAction = {
    action: 'add',
    ...mountRequest
  }

  const response = await fetch(`${baseUrl}/smb/mount`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestWithAction),
  })

  if (!response.ok) {
    await handleHttpError(response, 'Add SMB share configuration')
  }

  return await response.json()
}

/**
 * Mount SMB share with retry logic and different option sets
 * This function will try multiple mount configurations to handle capability issues
 * and ensures the share is actually mounted after configuration using mount-all
 */
export const mountSmbShareWithRetry = async (mountRequest: SmbMountRequest): Promise<SmbMountResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  // Try with safe mount options first
  const safeOptions = createSafeMountOptions(
    mountRequest.user,
    mountRequest.uid,
    mountRequest.gid,
    mountRequest.file_mode,
    mountRequest.dir_mode
  )

  const requestWithSafeOptions = {
    action: 'add',
    ...mountRequest,
    options: safeOptions
  }

  try {
    const response = await fetch(`${baseUrl}/smb/mount`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestWithSafeOptions),
    })

    if (!response.ok) {
      await handleHttpError(response, 'Mount SMB share')
    }

    const result = await response.json()
    if (result.status === 'success') {
      // Configuration created successfully, now mount all shares
      try {
        const mountResult = await mountAllSmbShares()
        // Return the mount-all result which shows service status
        return mountResult
      } catch (mountError) {
        console.warn('Configuration created but mount-all failed:', mountError)
        // Return the original configuration result even if mounting failed
        return result
      }
    }

    // If the first attempt failed, try with minimal options
    console.warn('First mount attempt failed, trying with minimal options:', result.message)

    const minimalOptions = 'rw,uid=1000,gid=1000,file_mode=0644,dir_mode=0755'
    const minimalRequest = {
      action: 'add',
      ...mountRequest,
      options: minimalOptions
    }

    const retryResponse = await fetch(`${baseUrl}/smb/mount`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(minimalRequest),
    })

    if (!retryResponse.ok) {
      await handleHttpError(retryResponse, 'Mount SMB share with minimal options')
    }

    const retryResult = await retryResponse.json()

    // If retry was successful, mount all shares
    if (retryResult.status === 'success') {
      try {
        const mountResult = await mountAllSmbShares()
        return mountResult
      } catch (mountError) {
        console.warn('Configuration created but mount-all failed:', mountError)
        // Return the original result even if mounting failed
        return retryResult
      }
    }

    return retryResult
  } catch (error) {
    console.error('SMB mount failed:', error)
    throw error
  }
}

/**
 * Remove an SMB share configuration and trigger mount-all to apply changes
 * This will remove the configuration and unmount the share if it's currently mounted
 */
export const unmountSmbShare = async (server: string, share: string): Promise<SmbMountResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const requestBody = {
    action: 'remove',
    server: server,
    share: share
  }

  const response = await fetch(`${baseUrl}/smb/mount`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    await handleHttpError(response, 'Remove SMB share configuration')
  }

  const result = await response.json()

  if (result.status === 'success') {
    // Configuration removed successfully, now trigger mount-all to apply changes
    try {
      const mountAllResult = await mountAllSmbShares()
      // Return the mount-all result which shows the updated service status
      return mountAllResult
    } catch (mountError) {
      console.warn('Configuration removed but mount-all failed:', mountError)
      // Return the original removal result even if mount-all failed
      return result
    }
  }

  return result
}

/**
 * Mount all configured SMB shares using the systemd service
 * This replaces individual mount operations and ensures proper system-wide mounting
 */
export const mountAllSmbShares = async (): Promise<SmbMountResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await fetch(`${baseUrl}/smb/mount-all`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    await handleHttpError(response, 'Mount all SMB shares')
  }

  return await response.json()
}

/**
 * Get detailed mount diagnostics for troubleshooting
 */
export const getSmbMountDiagnostics = async (id: number): Promise<SmbDiagnosticsResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await fetch(`${baseUrl}/smb/mounts/${id}/diagnostics`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    await handleHttpError(response, 'Get SMB mount diagnostics')
  }

  return await response.json()
}

/**
 * Check if SMB mount capabilities are available on the system
 */
export const checkSmbCapabilities = async (): Promise<SmbCapabilitiesResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await fetch(`${baseUrl}/smb/capabilities`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    await handleHttpError(response, 'Check SMB capabilities')
  }

  return await response.json()
}
