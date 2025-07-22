import { useAppConfigStore } from '@/stores/appconfig'

// Types for Spotify API
export interface SpotifyAuthResponse {
  session_id: string
  status: string
  message?: string
}

export interface SpotifyStatusResponse {
  authenticated: boolean
  expires_at?: number
  username?: string
  error?: string
  error_description?: string
}

export interface SpotifyTokensResponse {
  status: string
  message?: string
  error?: string
}

export interface SpotifyDisconnectResponse {
  authenticated: boolean
  status: string
  message?: string
  error?: string
}

export interface SpotifyPollResponse {
  status: 'completed' | 'error' | 'pending'
  token_data?: {
    access_token: string
    refresh_token: string
    expires_in: number
  }
  error?: string
}

/**
 * Get Spotify authentication status
 */
export const getSpotifyStatus = async (): Promise<SpotifyStatusResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getApiBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/spotify/status`)

    if (!response.ok) {
      throw new Error(`Failed to get Spotify status: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting Spotify status:', error)
    throw error
  }
}

/**
 * Create Spotify authentication session
 */
export const createSpotifySession = async (): Promise<SpotifyAuthResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getApiBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/spotify/create_session`)

    if (!response.ok) {
      throw new Error(`Failed to create Spotify session: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating Spotify session:', error)
    throw error
  }
}

/**
 * Get Spotify login URL
 */
export const getSpotifyLoginUrl = async (sessionId: string): Promise<SpotifyAuthResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getApiBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/spotify/login/${sessionId}`)

    if (!response.ok) {
      throw new Error(`Failed to get Spotify login URL: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting Spotify login URL:', error)
    throw error
  }
}

/**
 * Poll for Spotify authentication completion
 */
export const pollSpotifyAuth = async (sessionId: string): Promise<SpotifyPollResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getApiBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/spotify/poll/${sessionId}`)

    if (!response.ok) {
      throw new Error(`Failed to poll Spotify auth: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error polling Spotify auth:', error)
    throw error
  }
}

/**
 * Store Spotify tokens
 */
export const storeSpotifyTokens = async (tokenData: {
  access_token: string
  refresh_token: string
  expires_in: number
}): Promise<SpotifyTokensResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getApiBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/spotify/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tokenData)
    })

    if (!response.ok) {
      throw new Error(`Failed to store Spotify tokens: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error storing Spotify tokens:', error)
    throw error
  }
}

/**
 * Disconnect from Spotify
 */
export const disconnectSpotify = async (): Promise<SpotifyDisconnectResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getApiBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/spotify/logout`, {
      method: 'POST'
    })

    if (!response.ok) {
      throw new Error(`Failed to disconnect from Spotify: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error disconnecting from Spotify:', error)
    throw error
  }
}
