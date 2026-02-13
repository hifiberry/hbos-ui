import { useAppConfigStore } from '@/stores/appconfig'
import { rewriteAudiocontrolApiUrl } from './utils'
import { useToastStore } from '@/stores/toast'

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
  const toastStore = useToastStore()
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
    toastStore.showErrorToast("Could not send player command.")
    console.error('Error sending player command:', error)
    throw error
  }
}

/**
 * Pause all available players. If a player does not support pause, it will be stopped instead.
 * @returns Promise<boolean> - Success or failure
 */
export const pauseAllPlayers = async (): Promise<boolean> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getApiBaseUrl()

    // Primary (documented) endpoint
    const url = `${apiBaseUrl}/players/pause-all`
    console.log('Pausing all players (bulk endpoint):', url)

    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } })

    if (response.ok) {
      const result = await response.json().catch(() => ({}))
      console.log('Pause all players response:', result)
      return true
    }

    // Fall-through to per-player fallback on non-OK
    console.warn('Bulk pause-all failed, attempting per-player fallback:', response.status, response.statusText)
    throw new Error(`pause-all failed: ${response.status} ${response.statusText}`)

  } catch (error) {
    console.error('Error pausing all players (will try fallback):', error)

    // Fallback: enumerate players and send pause/stop to each
    try {
      const configStore = useAppConfigStore()
      const apiBaseUrl = configStore.getApiBaseUrl()

      const listResp = await fetch(`${apiBaseUrl}/players`)
      if (!listResp.ok) {
        throw new Error(`Failed to list players: ${listResp.status} ${listResp.statusText}`)
      }
      const listJson = await listResp.json()
      const players: Array<{ name: string }> = listJson?.players || []

      let succeeded = 0
      for (const p of players) {
        const pauseUrl = `${apiBaseUrl}/player/${encodeURIComponent(p.name)}/command/pause`
        const stopUrl = `${apiBaseUrl}/player/${encodeURIComponent(p.name)}/command/stop`
        try {
          const r = await fetch(pauseUrl, { method: 'POST' })
          if (r.ok) {
            succeeded++
            continue
          }
          // Try stop if pause not supported
          const s = await fetch(stopUrl, { method: 'POST' })
          if (s.ok) succeeded++
        } catch (e) {
          console.warn(`Failed to pause/stop player '${p.name}':`, e)
        }
      }

      console.log(`Per-player pause/stop succeeded for ${succeeded}/${players.length} players`)
      return succeeded > 0
    } catch (fallbackErr) {
      console.error('Fallback pause-all failed:', fallbackErr)
      return false
    }
  }
}

/**
 * Stop all available players.
 * @returns Promise<boolean> - Success or failure
 */
export const stopAllPlayers = async (): Promise<boolean> => {
  try {
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getApiBaseUrl()

    // Primary (documented) endpoint
    const url = `${apiBaseUrl}/players/stop-all`
    console.log('Stopping all players (bulk endpoint):', url)

    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } })

    if (response.ok) {
      const result = await response.json().catch(() => ({}))
      console.log('Stop all players response:', result)
      return true
    }

    // Fall-through to per-player fallback on non-OK
    console.warn('Bulk stop-all failed, attempting per-player fallback:', response.status, response.statusText)
    throw new Error(`stop-all failed: ${response.status} ${response.statusText}`)

  } catch (error) {
    console.error('Error stopping all players (will try fallback):', error)

    // Fallback: enumerate players and send stop to each
    try {
      const configStore = useAppConfigStore()
      const apiBaseUrl = configStore.getApiBaseUrl()

      const listResp = await fetch(`${apiBaseUrl}/players`)
      if (!listResp.ok) {
        throw new Error(`Failed to list players: ${listResp.status} ${listResp.statusText}`)
      }
      const listJson = await listResp.json()
      const players: Array<{ name: string }> = listJson?.players || []

      let succeeded = 0
      for (const p of players) {
        const stopUrl = `${apiBaseUrl}/player/${encodeURIComponent(p.name)}/command/stop`
        try {
          const r = await fetch(stopUrl, { method: 'POST' })
          if (r.ok) {
            succeeded++
          }
        } catch (e) {
          console.warn(`Failed to stop player '${p.name}':`, e)
        }
      }

      console.log(`Per-player stop succeeded for ${succeeded}/${players.length} players`)
      return succeeded > 0
    } catch (fallbackErr) {
      console.error('Fallback stop-all failed:', fallbackErr)
      return false
    }
  }
}
