import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

import { storeToRefs } from 'pinia'
import { useSongsStore } from '@/stores/songs'

import { formatTime } from '@/helpers/formatTime'

interface currentData {
  loop_mode: string
}

export const useAudioControls = defineStore('audio-controls', () => {
  const { song } = storeToRefs(useSongsStore())

  // State
  const isSendingCommand = ref(false)
  const isPlaying = ref(false)
  const isPaused = ref(true)

  const canShuffle = ref(true) // TODO check on initiating
  const isShuffle = ref(false) // TODO get from response data

  const canLoop = ref(true) // TODO check on initiating
  const currentLoopMode = ref('none') // TODO get from currentData

  const seekPosition = ref(50) // TODO set initial seekPosition
  const songDurationTime = computed(() => formatTime(song.value?.duration))
  const seekPositionTime = computed(() =>
    formatTime(((song.value?.duration || 0) * (seekPosition.value || 0)) / 100),
  )

  // TODO create 'current-player' Store
  // TODO get currentData in the 'current-player' Store
  const currentData: currentData = {
    loop_mode: 'none', // 'none', 'no', 'track', 'song', 'playlist'
  }

  // Getters
  const isPlayingOrPaused = computed(() => isPlaying.value || isPaused.value)

  // Actions
  // TODO move to 'current-player'
  const initPlayer = () => {
    console.log('initPlayer')

    isSendingCommand.value = true

    return new Promise((resolve) => {
      setTimeout(() => {
        isSendingCommand.value = false
        resolve(true)
      }, 2400)
    })
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
    apiBase: string = '',
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

  const togglePlayPause = () => {
    const command = isPlaying.value ? 'pause' : 'play'

    stopAutoProgress()

    sendCommand(command, 'playerName', 'apiBase').then((command_result) => {
      if (command_result === 'play') {
        isPlaying.value = true
        isPaused.value = false

        startAutoProgress()
      } else if (command_result === 'pause') {
        isPlaying.value = false
        isPaused.value = true

        stopAutoProgress()
      }

      console.log('togglePlayPause', {
        isPlaying: isPlaying.value,
        isPaused: isPaused.value,
        isPlayingOrPaused: isPlayingOrPaused.value,
      })
    })
  }

  const playNextOrPrev = (nextOrPrev: string) => {
    sendCommand(nextOrPrev, 'playerName', 'apiBase').then((command_result) => {
      console.log('playNextOrPrev', {
        command_result: command_result,
      })
    })
  }

  /**
   * Toggle shuffle state
   * @param {string} playerName - Optional specific player name
   * @param {string} apiBase - The base URL for the API
   * @returns {Promise<boolean>} Success or failure
   */
  // TODO fix Promise<string | boolean>, leave only boolean
  async function toggleShuffle(
    playerName: string | null = null,
    apiBase: string = 'PLAYER_CONFIG.apiBasePath',
  ): Promise<string | boolean> {
    console.log('toggleShuffle')

    try {
      // First fetch the current state to toggle it
      // const response = await fetch(`${apiBase}/now-playing`)
      // const data = await response.json()

      const data = {
        // shuffle: true, // or false
        shuffle: isShuffle.value, // TODO get from response data
      }

      if (data.shuffle !== undefined) {
        // Send the opposite of the current shuffle state
        return await sendCommand(`set_random:${!data.shuffle}`, playerName, apiBase).then(() => {
          isShuffle.value = !data.shuffle

          return true
        })
      }
      return false
    } catch (error) {
      console.error('Error toggling shuffle:', error)
      return false
    }
  }

  /**
   * Cycle through loop modes: None -> Track -> Playlist -> None
   *  currentData - The current player data // getting from the State
   * @param {string} playerName - Optional specific player name
   * @param {string} apiBase - The base URL for the API
   * @returns {Promise<boolean>} Success or failure
   */

  // TODO fix Promise<string | boolean>, leave only boolean
  async function cycleLoopMode(
    // currentData: currentData, // getting from the State
    playerName: string | null = null,
    apiBase: string = 'PLAYER_CONFIG.apiBasePath',
  ): Promise<string | boolean> {
    console.log('cycleLoopMode')

    if (!currentData) return false

    let nextMode: string | undefined
    // Check the loop mode value case-insensitively since API might use different cases
    // const currentMode = (currentData.loop_mode || '').toLowerCase()

    // console.log(`Current loop mode: ${currentMode}`)

    // switch (currentMode) {
    switch (
      currentLoopMode.value // TODO get from currentData
    ) {
      case 'none':
      case 'no':
        nextMode = 'track' // May be change to 'playlist'
        break
      case 'track':
      case 'song':
        nextMode = 'playlist' // May be change to 'none'
        break
      case 'playlist':
      default:
        nextMode = 'none' // May be change to 'track'
        break
    }

    console.log(`Setting new loop mode: ${nextMode}`)

    return await sendCommand(`set_loop:${nextMode}`, playerName, apiBase).then(() => {
      currentLoopMode.value = nextMode // TODO get current state from BE

      console.log('currentLoopMode', currentLoopMode.value)

      return true
    })
  }

  /**
   * Send a seek command to the player
   * @param {number} position - The position to seek to in seconds
   * @param {string} playerName - Optional specific player name
   * @param {string} apiBase - The base URL for the API
   * @returns {Promise<boolean>} Success or failure
   */
  // TODO fix Promise<string | boolean>, leave only boolean
  async function seekToPosition(
    position: number,
    playerName: string | null = null,
    apiBase: string = 'PLAYER_CONFIG.apiBasePath',
  ): Promise<string | boolean> {
    try {
      stopAutoProgress()

      const seekCommand = `seek:${Math.floor(position)}`
      return await sendCommand(seekCommand, playerName, apiBase).then(() => {
        seekPosition.value = position

        if (isPlaying.value && song.value?.duration) {
          startAutoProgress()
        }

        return seekCommand
      })
    } catch (error) {
      console.error('Error seeking to position:', error)
      return false
    }
  }

  const progressInterval = ref<number | undefined>(undefined)

  function startAutoProgress() {
    // Stop any existing interval first
    stopAutoProgress()

    // Do all checks

    if (isPlaying.value && song.value?.duration) {
      const delta = +(10 / song.value.duration).toFixed(9)

      progressInterval.value = setInterval(() => {
        seekPosition.value = +(seekPosition.value + delta).toFixed(9)

        if (seekPosition.value >= 100) {
          // Stop at the end of the song
          // data.position = data.song.duration

          // Force an update of player state from server when we reach the end
          // console.log('Track reached the end, fetching current player state from server')
          // fetchCurrentPlayer()

          togglePlayPause()

          seekPosition.value = 0 // Don't stop the timer yet - it will be managed based on the updated state
        }
      }, 100)
    } else {
      stopAutoProgress()
    }
  }

  function stopAutoProgress() {
    if (progressInterval.value) {
      console.log('clearInterval')

      clearInterval(progressInterval.value)
      progressInterval.value = undefined
    }
  }

  return {
    // State
    isSendingCommand,
    isPlaying,
    isPaused,
    seekPosition,
    currentData,
    progressInterval,
    canShuffle,
    isShuffle,
    canLoop,
    currentLoopMode,
    // Getters
    isPlayingOrPaused,
    songDurationTime,
    seekPositionTime,
    // Actions
    initPlayer,
    sendCommand,
    togglePlayPause,
    playNextOrPrev,
    toggleShuffle,
    cycleLoopMode,
    seekToPosition,
    startAutoProgress,
    stopAutoProgress,
  }
})
