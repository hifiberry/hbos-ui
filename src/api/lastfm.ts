import { useAppConfigStore } from '@/stores/appconfig'

// Types for Last.FM API
export interface LastFMAuthResponse {
  url: string
  request_token: string
  error?: string
}

export interface LastFMStatusResponse {
  authenticated: boolean
  username?: string
  error?: string
  error_description?: string
}

export interface LastFMCompleteAuthResponse {
  authenticated: boolean
  username?: string
  error?: string
  error_description?: string
}

export interface LastFMPrepareAuthResponse {
  success: boolean
  error?: string
}

export interface LastFMDisconnectResponse {
  authenticated: boolean
  error?: string
  error_description?: string
}

/**
 * Get Last.FM authentication status
 */
export const getLastFMStatus = async (): Promise<LastFMStatusResponse> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getApiBaseUrl()

  const response = await fetch(`${baseUrl}/lastfm/status`)

  if (!response.ok) {
    throw new Error(`Failed to get Last.FM status: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Start Last.FM authentication process
 */
export const startLastFMAuth = async (): Promise<LastFMAuthResponse> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getApiBaseUrl()

  const response = await fetch(`${baseUrl}/lastfm/auth`)

  if (!response.ok) {
    throw new Error(`Failed to start Last.FM auth: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Prepare backend for authentication completion
 */
export const prepareLastFMAuthCompletion = async (token: string): Promise<LastFMPrepareAuthResponse> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getApiBaseUrl()

  const response = await fetch(`${baseUrl}/lastfm/prepare_complete_auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token })
  })

  if (!response.ok) {
    throw new Error(`Failed to prepare Last.FM auth completion: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Complete Last.FM authentication
 */
export const completeLastFMAuth = async (): Promise<LastFMCompleteAuthResponse> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getApiBaseUrl()

  const response = await fetch(`${baseUrl}/lastfm/complete_auth`)

  if (!response.ok) {
    throw new Error(`Failed to complete Last.FM auth: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Disconnect from Last.FM
 */
export const disconnectLastFM = async (): Promise<LastFMDisconnectResponse> => {
  const configStore = useAppConfigStore()
  const baseUrl = configStore.getApiBaseUrl()

  const response = await fetch(`${baseUrl}/lastfm/disconnect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to disconnect from Last.FM: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
