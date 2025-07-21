import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'

import { useToastStore } from '@/stores/toast'
import { useLibraryStore } from '@/stores/library'
import { useLibraryFetch } from '@/composables/useLibraryFetch.ts'
import { usePlayerWebSocket } from '@/stores/player-web-socket'
import { usePlayerChangesStore } from '@/stores/player-changes'
import { addTrackToPlayer } from '@/api/player'
import { useFavourites } from '@/composables/useFavourites'

import {
  DEFAULT_CAPABILITIES,
  extractPlayerCapabilities,
} from '@/helpers/extractPlayerCapabilities'

import type { Track } from '@/types/library'
import type { Player, CurrentPlayer, Song, Capabilities } from '@/types/player'

import { useAppConfigStore } from '@/stores/appconfig'

// Configuration
export const PLAYER_CONFIG = {
  pollingInterval: 30000, // Time in milliseconds between updates (30 seconds)
  fastUpdateAfterCommand: 300, // Time to wait for quick update after sending a command
  wsReconnectInterval: 5000, // Time to wait before attempting to reconnect WebSocket
}

export const usePlayerStore = defineStore('player', () => {
  const configStore = useAppConfigStore()
  const toastStore = useToastStore()
  const libraryFetch = useLibraryFetch()
  const playerWebSocket = usePlayerWebSocket()
  const playerChangesStore = usePlayerChangesStore()
  const favourites = useFavourites()

  // State
  const updateIntervalID = ref<number | undefined>(undefined)
  const currentData = ref<CurrentPlayer | null>(null)

  const loading = ref<boolean>(false)
  const isSendingCommand = ref<boolean>(false)

  const playerCapabilities = ref<Capabilities>(DEFAULT_CAPABILITIES)

  // Favourites state
  const currentSongIsFavourite = ref<boolean>(false)
  const checkingFavourite = ref<boolean>(false)

  // Getters
  const currentPlayerName = computed<string | null>(() => currentData.value?.player?.name || null)
  const currentSong = computed<Song | null>(() => currentData.value?.song || null)

  // Action
  const addTrackToQueue = async (track: Track) => {
    loading.value = true

    const trackIdentifier = typeof track === 'object' ? track?.id || track.uri : track

    if (trackIdentifier) {
      try {
        // Get the active library player name
        const libraryStore = useLibraryStore()
        if (!libraryStore.activeLibrary) {
          await libraryStore.getAvailableLibrary()
        }

        if (!libraryStore.activeLibrary) {
          throw new Error('No library player available')
        }

        // Use the new addTrackToPlayer function with JSON payload
        await addTrackToPlayer(libraryStore.activeLibrary, trackIdentifier)

      } catch (error) {
        console.error('Error adding track to queue:', error)
        toastStore.showErrorToast(`Failed to add track to queue: ${error}`)
      }
    } else {
      toastStore.showErrorToast('No valid track identifier available')
    }

    loading.value = false
  }

  // ! for now we have only mpd player
  async function fetchPlayersAndUpdatePlayerDropdown() {
    const players = await fetchPlayers()

    console.log('players', players)

    // UpdatePlayerDropdown (not implemented yet)
  }

  // Fetch available players
  /**
   * Fetch available players from the API
   * @param {string} apiBase - The base URL for the API
   * @returns {Promise<Array<Player>>} Array of player objects
   */
  async function fetchPlayers(): Promise<Array<Player>> {
    console.log('fetchPlayers')
    try {
      const apiBase = configStore.getApiBaseUrl()
      const response = await fetch(`${apiBase}/players`)
      const data = await response.json()
      console.log('fetchPlayers data', data)
      if (data.players && Array.isArray(data.players)) {
        return data.players
      } else {
        console.error('Invalid players data structure:', data)
        return []
      }
    } catch (error) {
      console.error('Failed to fetch players:', error)
      return []
    }
  }

  // Check if current song is favourite
  const checkCurrentSongFavouriteStatus = async () => {
    const song = currentSong.value
    if (!song || !song.artist || !song.title) {
      currentSongIsFavourite.value = false
      return
    }

    try {
      checkingFavourite.value = true
      currentSongIsFavourite.value = await favourites.isFavourite({
        artist: song.artist,
        title: song.title
      })
    } catch (error) {
      console.error('Error checking favourite status:', error)
    } finally {
      checkingFavourite.value = false
    }
  }

  // Toggle favourite status of current song
  const toggleCurrentSongFavourite = async (): Promise<boolean> => {
    const song = currentSong.value
    if (!song || !song.artist || !song.title) {
      toastStore.showErrorToast('No song currently playing')
      return false
    }

    try {
      const success = await favourites.toggleFavourite({
        artist: song.artist,
        title: song.title
      })

      if (success) {
        // Update the local state immediately
        currentSongIsFavourite.value = !currentSongIsFavourite.value

        const action = currentSongIsFavourite.value ? 'added to' : 'removed from'
        toastStore.showSuccessToast(`"${song.title}" ${action} favourites`)
      } else {
        toastStore.showErrorToast(favourites.error.value || 'Failed to update favourites')
      }

      return success
    } catch (error) {
      console.error('Error toggling favourite:', error)
      toastStore.showErrorToast('Failed to update favourites')
      return false
    }
  }

  // Watch for song changes to update favourite status
  watch(currentSong, (newSong, oldSong) => {
    // Only check if song actually changed
    if (newSong?.title !== oldSong?.title || newSong?.artist !== oldSong?.artist) {
      checkCurrentSongFavouriteStatus()
    }
  }, { immediate: true })

  /**
   * Fetch current player and now playing information
   * @param {string} apiBase - The base URL for the API
   * @returns {Promise<CurrentPlayer | null>} Current player data
   */
  async function fetchCurrentPlayer(): Promise<CurrentPlayer | null> {
    console.log('*** fetchCurrentPlayer')
    try {
      const apiBase = configStore.getApiBaseUrl()
      const response = await fetch(`${apiBase}/now-playing`)
      const data = await response.json()
      console.log('fetchCurrentPlayer data', data)
      if (!data) {
        throw new Error('No Data')
      }
      // If we're using the "Default (Active Player)" option (currentPlayerName is null)
      // and the active player has changed, we need to resubscribe
      const oldPlayerName = currentData.value?.player?.name
      const newPlayerName = data.player?.name
      const needsResubscribe = !currentPlayerName.value && oldPlayerName !== newPlayerName
      console.log('needsResubscribe', needsResubscribe)
      // Notify about player change if it actually changed
      if (oldPlayerName !== newPlayerName) {
        playerChangesStore.player_changed(oldPlayerName || null, newPlayerName || null)
      }
      currentData.value = data
      // Extract player capabilities
      playerCapabilities.value = extractPlayerCapabilities(data)
      console.log('playerCapabilities.value', playerCapabilities.value)
      // Resubscribe if needed (active player changed while using default selection)
      if (needsResubscribe) {
        console.log(
          `Active player changed from ${oldPlayerName || 'none'} to ${newPlayerName || 'none'}, resubscribing...`,
        )
        await playerWebSocket.subscribeToPlayerEvents()
      }
      return Promise.resolve(data)
    } catch (error) {
      console.error('Failed to fetch current player:', error)
      return Promise.resolve(null)
    }
  }

  async function retrieveActivePlayer() {
    console.log('retrieveActivePlayer')
    try {
      const apiBase = configStore.getApiBaseUrl()
      const response = await fetch(`${apiBase}/now-playing`)
      const data = await response.json()
      if (data && data.player && data.player.name) {
        console.log(`Retrieved active player name: ${data.player.name}`)
        return data.player.name
      } else {
        console.warn('No active player found or player name not available')
        return null
      }
    } catch (error) {
      console.error('Failed to get active player name:', error)
      return null
    }
  }

  const initPlayer = async () => {
    console.log('initPlayer')

    isSendingCommand.value = true

    // await fetchPlayersAndUpdatePlayerDropdown() // for now we have only mpd player

    // Set up WebSocket connection first, before fetching current player
    playerWebSocket.setupWebSocket()

    await fetchCurrentPlayer()

    isSendingCommand.value = false

    // Set up periodic updates using the configured polling interval
    updateIntervalID.value = setInterval(fetchCurrentPlayer, PLAYER_CONFIG.pollingInterval)
  }

  const clearPollingInterval = () => {
    clearInterval(updateIntervalID.value)

    updateIntervalID.value = undefined
  }

  /**
   * Send a command to the player
   * @param {string} command - The command to send
   * @param {string} apiBase - The base URL for the API
   * @returns {Promise<boolean>} Success or failure
   */
  const sendCommand = async (command: string): Promise<boolean> => {
    const apiBase = configStore.getApiBaseUrl()
    console.log('sendCommand', { command, currentPlayerName: currentPlayerName.value, apiBase })
    isSendingCommand.value = true
    try {
      // Build the URL based on whether we're using a specific player or the active player
      let url
      if (currentPlayerName.value) {
        // Send to specific player
        url = `${apiBase}/player/${currentPlayerName.value}/command/${command}`
      } else {
        // Send to active player (default)
        url = `${apiBase}/player/active/command/${command}`
      }
      console.log(`Sending command to: ${url}`)
      const response = await fetch(url, {
        method: 'POST',
      })
      console.log('sendCommand', response)
      // ! We could update UI and State when getting WebSocket message
      // ! but we dont get messages on 'loop_mode_changed' and 'shuffle_changed'
      // ! that's why we fetchCurrentPlayer()
      return new Promise((resolve) => {
        setTimeout(async () => {
          const data = await fetchCurrentPlayer()
          resolve(Boolean(data))
        }, PLAYER_CONFIG.fastUpdateAfterCommand)
      })
    } catch (error) {
      console.error('Error sending command:', error)
      return false
    } finally {
      isSendingCommand.value = false
    }
  }

  // Set volume for the current player
  const setVolume = async (volume: number): Promise<boolean> => {
    if (volume < 0 || volume > 100) {
      console.error('Volume must be between 0 and 100')
      return false
    }

    return await sendCommand(`set_volume:${Math.round(volume)}`)
  }

  // Send a command to the library player (not the active player)
  const sendLibraryCommand = async (command: string): Promise<boolean> => {
    const libraryStore = useLibraryStore()
    console.log('sendLibraryCommand', {
      command,
      activeLibrary: libraryStore.activeLibrary,
      isAvailableLibrary: libraryStore.isAvailableLibrary
    })

    isSendingCommand.value = true

    try {
      if (!libraryStore.activeLibrary) {
        console.log('No active library, fetching available library...')
        await libraryStore.getAvailableLibrary()
        console.log('After fetching, activeLibrary is:', libraryStore.activeLibrary)
      }

      if (!libraryStore.activeLibrary) {
        throw new Error('No library player available')
      }

      const url = `/player/:activeLibrary/command/${command}`
      console.log('Sending library command to URL:', url, 'which will resolve to:', url.replace(':activeLibrary', libraryStore.activeLibrary))

      const { error } = await libraryFetch(url)
        .post()
        .json()

      if (error.value) {
        console.error('Error sending library command:', error.value)
        toastStore.showErrorToast(`Command error: ${error.value}`)
        return false
      }

      // Update player state after command
      return new Promise((resolve) => {
        setTimeout(async () => {
          const data = await fetchCurrentPlayer()
          resolve(Boolean(data))
        }, PLAYER_CONFIG.fastUpdateAfterCommand)
      })
    } catch (error) {
      console.error('Error sending library command:', error)
      return false
    } finally {
      isSendingCommand.value = false
    }
  }

  return {
    // State
    updateIntervalID,
    currentData,
    isSendingCommand,
    loading,
    playerCapabilities,
    currentSongIsFavourite,
    checkingFavourite,
    // Getters
    currentPlayerName,
    currentSong,
    // Action
    clearPollingInterval,
    addTrackToQueue,
    initPlayer,
    fetchPlayers,
    fetchPlayersAndUpdatePlayerDropdown,
    fetchCurrentPlayer,
    retrieveActivePlayer,
    sendCommand,
    sendLibraryCommand,
    setVolume,
    // Favourites
    checkCurrentSongFavouriteStatus,
    toggleCurrentSongFavourite,
  }
})
