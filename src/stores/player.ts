import { ref } from 'vue'
import { defineStore } from 'pinia'

import { useToastStore } from '@/stores/toast'

import { useLibraryFetch } from '@/composables/useLibraryFetch.ts'

import type { Track } from '@/types/library'

const API_BASE_URL = 'http://localhost:1080/api'

// Configuration
/* const PLAYER_CONFIG = {
  pollingInterval: 30000, // Time in milliseconds between updates (30 seconds)
  fastUpdateAfterCommand: 300, // Time to wait for quick update after sending a command
  wsReconnectInterval: 5000, // Time to wait before attempting to reconnect WebSocket
  progressUpdateInterval: 500, // Time in milliseconds between progress bar updates (0.5 seconds)
  // apiBasePath: '/api'
} */

// Default player capabilities (all disabled)
/* const DEFAULT_CAPABILITIES = {
  canPlay: false,
  canPause: false,
  canStop: false,
  canPrevious: false,
  canNext: false,
  canSeek: false,
  hasQueue: false,
  canShuffle: false,
  canLoop: false,
} */

export const usePlayerStore = defineStore('player', () => {
  const toastStore = useToastStore()
  const libraryFetch = useLibraryFetch()

  // State
  const loading = ref<boolean>(false)
  const isSendingCommand = ref<boolean>(false)

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

  // Fetch available players
  // async function fetchPlayers() {
  // const players = await PlayerFunctions.fetchPlayers(API_BASE)
  // PlayerFunctions.updatePlayerDropdown(players, playerSelect, libraryBtn, (name) => {
  //   currentPlayerName = name
  // })
  // }

  /**
   * Fetch available players from the API
   * @param {string} apiBase - The base URL for the API
   * @returns {Promise<Array>} Array of player objects
   */

  /*
    player object:
    {
      "name": "mpd",
      "id": "mpd:6600",
      "state": "stopped",
      "is_active": true,
      "has_library": true,
      "last_seen": "2025-06-25T10:55:42.462145804+00:00"
    }
  */
  async function fetchPlayers(apiBase: string = API_BASE_URL): Promise<Array<any>> {
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
   * @returns {Promise<object | null>} Current player data
   */

  /*
  CurrentPlayer:
    {
      "player": {
          "name": "mpd",
          "id": "mpd:6600",
          "state": "stopped",
          "is_active": true,
          "has_library": true,
          "last_seen": "2025-06-25T10:55:42.462145804+00:00"
      },
      "song": null,
      "state": "stopped",
      "shuffle": false,
      "loop_mode": "no",
      "position": null
    }
  */
  async function fetchCurrentPlayer(apiBase: string = API_BASE_URL): Promise<object | null> {
    console.log('fetchCurrentPlayer')
    try {
      const response = await fetch(`${apiBase}/now-playing`)
      const data = await response.json()

      console.log('fetchCurrentPlayer data', data)
      return data
    } catch (error) {
      console.error('Failed to fetch current player:', error)
      return Promise.resolve(null)
    }
  }

  const initPlayer = async () => {
    console.log('initPlayer')

    isSendingCommand.value = true

    // await fetchPlayers()
    await fetchCurrentPlayer()

    console.log('after fetchPlayers')

    isSendingCommand.value = false

    /* return new Promise((resolve) => {
      setTimeout(() => {
        isSendingCommand.value = false
        resolve(true)
      }, 2400)
    }) */
  }

  /**
   * Send a command to the player
   * @param {string} command - The command to send
   * @param {string} playerName - Optional specific player name
   * @param {string} apiBase - The base URL for the API
   * @returns {Promise<boolean>} Success or failure
   */
  // TODO fix Promise<string | boolean>, leave only boolean
  const sendCommand = (
    command: string,
    playerName: string | null = null,
    apiBase: string = API_BASE_URL,
  ): Promise<string | boolean> => {
    console.log('sendCommand', { command, playerName, apiBase })

    isSendingCommand.value = true

    return new Promise((resolve) => {
      setTimeout(() => {
        isSendingCommand.value = false
        resolve(command)
      }, 1200)
    })
  }

  return {
    // State
    isSendingCommand,
    // Action
    addTrackToQueue,
    initPlayer,
    fetchPlayers,
    sendCommand,
  }
})
