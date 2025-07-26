import { useAppConfigStore } from '@/stores/appconfig'
import { rewriteAudiocontrolApiUrl } from './utils'

// Re-export for backward compatibility
export const rewrite_audiocontrol_api_url = rewriteAudiocontrolApiUrl

/**
 * Add a track to a player's queue using JSON payload
 * @param playerName - The name of the player to add the track to
 * @param trackUri - The URI/URL of the track to add
 * @param metadata - Optional metadata object for the track
 * @returns Promise<boolean> - Success or failure
 */
export const addTrackToPlayer = async (
  playerName: string,
  trackUri: string,
  metadata?: {
    title?: string
    artist?: string
    album?: string
    coverart_url?: string
    duration?: number
    genre?: string
    year?: number
    [key: string]: string | number | boolean | null | undefined
  }
): Promise<boolean> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getApiBaseUrl()

    const url = `${apiBaseUrl}/player/${playerName}/command/add_track`
    const payload: { uri: string; metadata?: typeof metadata } = {
      uri: trackUri
    }

    // Add metadata if provided
    if (metadata && Object.keys(metadata).length > 0) {
      payload.metadata = metadata
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
