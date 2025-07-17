import { useAppConfigStore } from '@/stores/appconfig'

/**
 * Rewrite URLs that start with /api/ to use the full audiocontrol API prefix
 * This function helps to deal with reverse proxies that rewrite the API url without the API
 * server knowing the full path.
 * @param url - The URL to rewrite
 * @returns The rewritten URL with full API prefix
 */
export const rewrite_audiocontrol_api_url = (url: string): string => {
  if (!url || !url.startsWith('/api/')) {
    return url
  }

  const configStore = useAppConfigStore()
  const { useProxy } = configStore.apiConfig()

  if (useProxy) {
    // In development with proxy, just return the original URL
    return url
  }

  // In production, use the full API base URL
  const apiBaseUrl = configStore.getApiBaseUrl()

  // Split the URL into parts to handle encoding properly
  const urlParts = url.split('/')

  // Encode each part of the path after /api/
  const encodedParts = urlParts.map((part, index) => {
    if (index <= 2) {
      // Don't encode /api/ part
      return part
    }
    // Encode the path segments properly
    return encodeURIComponent(part)
  })

  // Reconstruct the URL with proper encoding
  const encodedUrl = encodedParts.join('/')

  // Replace /api/ with the full API base URL + /
  const rewrittenUrl = encodedUrl.replace('/api/', `${apiBaseUrl}/`)

  // Debug logging to understand what's happening in production
  console.log('URL rewriting:', {
    original: url,
    encoded: encodedUrl,
    rewritten: rewrittenUrl,
    apiBaseUrl,
    config: configStore.apiConfig()
  })

  return rewrittenUrl
}

/**
 * Add a track to a player's queue using JSON payload
 * @param playerName - The name of the player to add the track to
 * @param trackUri - The URI/URL of the track to add
 * @param title - Optional title for the track (future use)
 * @param coverartUrl - Optional cover art URL (future use)
 * @returns Promise<boolean> - Success or failure
 */
export const addTrackToPlayer = async (
  playerName: string,
  trackUri: string,
  title?: string,
  coverartUrl?: string
): Promise<boolean> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getApiBaseUrl()

    const url = `${apiBaseUrl}/player/${playerName}/command/add_track`
    const payload = {
      uri: trackUri,
      ...(title && { title }),
      ...(coverartUrl && { coverart_url: coverartUrl })
    }

    console.log('Adding track to player:', { playerName, url, payload })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Failed to add track to player: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('Add track response:', result)
    return true

  } catch (error) {
    console.error('Error adding track to player:', error)
    throw error
  }
}

/**
 * Send a command to a player (excluding add_track which should use addTrackToPlayer)
 * @param playerName - The name of the player to send the command to
 * @param command - The command to send (e.g., 'play', 'pause', 'clear_queue')
 * @returns Promise<boolean> - Success or failure
 */
export const sendPlayerCommand = async (playerName: string, command: string): Promise<boolean> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getApiBaseUrl()

    // Prevent add_track commands from being sent through this function
    if (command.startsWith('add_track:')) {
      throw new Error('Use addTrackToPlayer() function for add_track commands instead of sendPlayerCommand()')
    }

    const url = `${apiBaseUrl}/player/${playerName}/command/${command}`
    console.log('Sending player command:', { playerName, command, url })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to send command to player: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('Player command response:', result)
    return true

  } catch (error) {
    console.error('Error sending player command:', error)
    throw error
  }
}
