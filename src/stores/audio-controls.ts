import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

interface currentData {
  loop_mode: string
}

export const useAudioControls = defineStore('audio-controls', () => {
  // State
  const isSendingCommand = ref(false)
  const isPlaying = ref(false)
  const isPaused = ref(true)
  const seekPosition = ref(42) // TODO set initial seekPosition

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

    sendCommand(command, 'playerName', 'apiBase').then((command_result) => {
      if (command_result === 'play') {
        isPlaying.value = true
        isPaused.value = false
      } else if (command_result === 'pause') {
        isPlaying.value = false
        isPaused.value = true
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
    try {
      // First fetch the current state to toggle it
      // const response = await fetch(`${apiBase}/now-playing`)
      // const data = await response.json()

      const data = {
        shuffle: true, // or false
      }

      if (data.shuffle !== undefined) {
        // Send the opposite of the current shuffle state
        return await sendCommand(`set_random:${!data.shuffle}`, playerName, apiBase)
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
    if (!currentData) return false

    let nextMode
    // Check the loop mode value case-insensitively since API might use different cases
    const currentMode = (currentData.loop_mode || '').toLowerCase()

    console.log(`Current loop mode: ${currentMode}`)

    switch (currentMode) {
      case 'none':
      case 'no':
        nextMode = 'track'
        break
      case 'track':
      case 'song':
        nextMode = 'playlist'
        break
      case 'playlist':
      default:
        nextMode = 'none'
        break
    }

    console.log(`Setting new loop mode: ${nextMode}`)
    return await sendCommand(`set_loop:${nextMode}`, playerName, apiBase)
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
      const seekCommand = `seek:${Math.floor(position)}`
      return await sendCommand(seekCommand, playerName, apiBase).then(() => {
        seekPosition.value = position
        return seekCommand
      })
    } catch (error) {
      console.error('Error seeking to position:', error)
      return false
    }
  }

  return {
    // State
    isSendingCommand,
    isPlaying,
    isPaused,
    seekPosition,
    currentData,
    // Getters
    isPlayingOrPaused,
    // Actions
    initPlayer,
    sendCommand,
    togglePlayPause,
    playNextOrPrev,
    toggleShuffle,
    cycleLoopMode,
    seekToPosition,
  }
})
