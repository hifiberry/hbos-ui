import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

import { useToastStore } from '@/stores/toast'
import { useLibraryStore } from '@/stores/library'
import { useLibraryFetch } from '@/composables/useLibraryFetch.ts'
import { usePlayerWebSocket } from '@/stores/player-web-socket'
import { usePlayerChangesStore } from '@/stores/player-changes'

import {
  DEFAULT_CAPABILITIES,
  extractPlayerCapabilities,
} from '@/helpers/extractPlayerCapabilities'

import type { Track } from '@/types/library'
import type { Player, CurrentPlayer, Song, Capabilities } from '@/types/player'

import { useConfigStore } from '@/stores/config'

// Configuration
export const PLAYER_CONFIG = {
  pollingInterval: 30000, // Time in milliseconds between updates (30 seconds)
  fastUpdateAfterCommand: 300, // Time to wait for quick update after sending a command
  wsReconnectInterval: 5000, // Time to wait before attempting to reconnect WebSocket
}

export const usePlayerStore = defineStore('player', () => {
  const configStore = useConfigStore()
  const toastStore = useToastStore()
  const libraryFetch = useLibraryFetch()
  const playerWebSocket = usePlayerWebSocket()
  const playerChangesStore = usePlayerChangesStore()

  // State
  const updateIntervalID = ref<number | undefined>(undefined)
  const currentData = ref<CurrentPlayer | null>(null)

  const loading = ref<boolean>(false)
  const isSendingCommand = ref<boolean>(false)

  const playerCapabilities = ref<Capabilities>(DEFAULT_CAPABILITIES)

  // Getters
  const currentPlayerName = computed<string | null>(() => currentData.value?.player?.name || null)
  const currentSong = computed<Song | null>(() => currentData.value?.song || null)

  // Action
  const addTrackToQueue = async (track: Track) => {
    loading.value = true

    const trackIdentifier = typeof track === 'object' ? track?.id || track.uri : track

    if (trackIdentifier) {
      const { error } = await libraryFetch(
        `/player/:activeLibrary/command/add_track:${encodeURIComponent(trackIdentifier)}`,
      )
        .post()
        .json()

      if (error.value) {
        toastStore.showErrorToast(error.value)
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
  }
})
