import { useConfigStore } from '@/stores/config'

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
    const configStore = useConfigStore()
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
    const configStore = useConfigStore()
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
