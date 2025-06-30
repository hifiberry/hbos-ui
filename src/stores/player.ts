import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

import { useToastStore } from '@/stores/toast'
import { useLibraryFetch } from '@/composables/useLibraryFetch.ts'

import {
  DEFAULT_CAPABILITIES,
  extractPlayerCapabilities,
} from '@/helpers/extractPlayerCapabilities'

import type { Track } from '@/types/library'
import type { Player, CurrentPlayer, Song, Capabilities } from '@/types/player'

import { API_BASE_URL } from '@/constants/api.ts'

// Configuration
export const PLAYER_CONFIG = {
  pollingInterval: 30000, // Time in milliseconds between updates (30 seconds)
  fastUpdateAfterCommand: 300, // Time to wait for quick update after sending a command
  wsReconnectInterval: 5000, // Time to wait before attempting to reconnect WebSocket
}

export const usePlayerStore = defineStore('player', () => {
  const toastStore = useToastStore()
  const libraryFetch = useLibraryFetch()

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
  async function fetchPlayers(apiBase: string = API_BASE_URL): Promise<Array<Player>> {
    console.log('fetchPlayers')

    try {
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

  // Fetch current player and now playing information
  /* async function fetchCurrentPlayer() {
    try {
      const data = await PlayerFunctions.fetchCurrentPlayer(API_BASE)

      if (data) {
        // If we're using the "Default (Active Player)" option (currentPlayerName is null)
        // and the active player has changed, we need to resubscribe
        const oldPlayerName = currentData?.player?.name
        const newPlayerName = data.player?.name
        const needsResubscribe = !currentPlayerName && oldPlayerName !== newPlayerName

        currentData = data

        // Extract player capabilities
        playerCapabilities = PlayerFunctions.extractPlayerCapabilities(data)

        // Update UI components
        PlayerFunctions.updatePlayerInfo(data, currentPlayerInfo, libraryBtn)

        PlayerFunctions.updateNowPlaying(
          data,
          nowPlayingInfo,
          progressBar,
          songThumbnail,
          noThumbnail,
          startAutoProgress,
          stopAutoProgress,
        )

        const buttons = {
          playPauseBtn,
          stopBtn,
          prevBtn,
          nextBtn,
          loopModeBtn,
          toggleShuffleBtn,
          libraryBtn,
        }

        PlayerFunctions.updateControlButtons(
          data,
          playerCapabilities,
          buttons,
          queuePanel,
          queueContainer,
          fetchQueue,
        )

        // If the player has a library, update the library button
        if (data.player && data.player.has_library) {
          libraryBtn.disabled = false
        } else {
          libraryBtn.disabled = true
        }

        // Resubscribe if needed (active player changed while using default selection)
        if (needsResubscribe) {
          console.log(
            `Active player changed from ${oldPlayerName || 'none'} to ${newPlayerName || 'none'}, resubscribing...`,
          )
          await subscribeToPlayerEvents()
        }
      }
    } catch (error) {
      console.error('Failed to fetch current player:', error)
    }
  } */

  /**
   * Fetch current player and now playing information
   * @param {string} apiBase - The base URL for the API
   * @returns {Promise<CurrentPlayer | null>} Current player data
   */
  async function fetchCurrentPlayer(apiBase: string = API_BASE_URL): Promise<CurrentPlayer | null> {
    console.log('*** fetchCurrentPlayer')

    try {
      const response = await fetch(`${apiBase}/now-playing`)
      const data = await response.json()

      console.log('fetchCurrentPlayer data', data)

      if (!data) {
        throw new Error('No Data')
      }

      currentData.value = data

      // Extract player capabilities
      playerCapabilities.value = extractPlayerCapabilities(data)

      console.log('playerCapabilities.value', playerCapabilities.value)

      return Promise.resolve(data)
    } catch (error) {
      console.error('Failed to fetch current player:', error)
      return Promise.resolve(null)
    }
  }

  const initPlayer = async () => {
    console.log('initPlayer')

    isSendingCommand.value = true

    // await fetchPlayersAndUpdatePlayerDropdown() // for now we have only mpd player
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
  const sendCommand = async (command: string, apiBase: string = API_BASE_URL): Promise<boolean> => {
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

      // ! We could updatу UI and State on getting WebSocket message
      // ! but we dont get messages on 'loop_mode_changed' and 'shuffle_changed'
      // ! that's why we leave this code
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
    sendCommand,
  }
})
