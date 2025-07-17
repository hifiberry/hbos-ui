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
  server: string
  share: string
  mountpoint?: string
  user?: string
  password?: string
  version?: string
  options?: string
}

export interface SmbMountResponse {
  status: 'success' | 'error'
  message: string
  data?: {
    server: string
    share: string
    mountpoint: string
    mounted: boolean
  }
  error?: string
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
    throw new Error(`HTTP error! status: ${response.status}`)
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

  const params = new URLSearchParams()
  if (username) params.append('username', username)
  if (password) params.append('password', password)

  const url = `${baseUrl}/smb/test/${encodeURIComponent(server)}${params.toString() ? `?${params.toString()}` : ''}`

  const response = await fetch(url, {
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

  const params = new URLSearchParams()
  if (username) params.append('username', username)
  if (password) params.append('password', password)
  if (detailed) params.append('detailed', 'true')

  const url = `${baseUrl}/smb/shares/${encodeURIComponent(server)}${params.toString() ? `?${params.toString()}` : ''}`

  const response = await fetch(url, {
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
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

/**
 * Add and mount a new SMB share for music access
 */
export const mountSmbShare = async (mountRequest: SmbMountRequest): Promise<SmbMountResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await fetch(`${baseUrl}/smb/mount`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mountRequest),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

/**
 * Unmount and remove an SMB share configuration
 */
export const unmountSmbShare = async (server: string, share: string): Promise<SmbMountResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getConfigApiBaseUrl()

  const response = await fetch(`${baseUrl}/smb/unmount/${encodeURIComponent(server)}/${encodeURIComponent(share)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}
