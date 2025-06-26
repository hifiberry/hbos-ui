import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'

import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player'

import { formatTime } from '@/helpers/formatTime'

export const useAudioControls = defineStore('audio-controls', () => {
  const playerStore = usePlayerStore()
  const { sendCommand } = playerStore
  const { currentData, currentSong } = storeToRefs(playerStore)

  // State
  const canShuffle = ref(true) // TODO check on initiating
  const isShuffle = ref(false) // TODO get from response data

  const canLoop = ref(true) // TODO check on initiating
  const currentLoopMode = ref('none') // TODO get from currentData

  const seekPosition = ref(0)

  // Getters
  const isPlaying = computed(() => currentData.value?.state === 'playing')
  const isPaused = computed(() => !isPlaying.value) // as we don't have 'stop' button
  const isPlayingOrPaused = computed(() => isPlaying.value || isPaused.value)

  const songDurationTime = computed(() => formatTime(currentSong.value?.duration))
  const seekPositionTime = computed(() =>
    formatTime(((currentSong.value?.duration || 0) * (seekPosition.value || 0)) / 100),
  )

  const progressIntervalID = ref<number | undefined>(undefined)

  watch(
    () => currentData.value,
    (newcurrentData) => {
      console.log('newcurrentData', newcurrentData)

      if (currentSong.value?.duration) {
        const percentage = ((newcurrentData?.position || 0) / currentSong.value.duration) * 100

        seekPosition.value = percentage

        if (isPlaying.value && !progressIntervalID.value) {
          startAutoProgress()
        }

        if (!isPlaying.value && progressIntervalID.value) {
          stopAutoProgress()
        }
      } else {
        seekPosition.value = 0
        stopAutoProgress()
      }
    },
    { immediate: true },
  )

  // Actions
  const togglePlayPause = () => {
    const command = isPlaying.value ? 'pause' : 'play'

    stopAutoProgress()

    sendCommand(command).then(() => {
      if (isPlaying.value) {
        startAutoProgress()
      } else {
        startAutoProgress()
      }

      console.log('togglePlayPause', {
        isPlaying: isPlaying.value,
        isPaused: isPaused.value,
        isPlayingOrPaused: isPlayingOrPaused.value,
      })
    })
  }

  const playNextOrPrev = (nextOrPrev: string) => {
    sendCommand(nextOrPrev).then(() => {
      console.log('playNextOrPrev: nextOrPrev')
    })
  }

  /**
   * Toggle shuffle state
   * @param {string} playerName - Optional specific player name
   * @returns {Promise<boolean>} Success or failure
   */
  // TODO fix Promise<string | boolean>, leave only boolean
  async function toggleShuffle(): Promise<string | boolean> {
    console.log('toggleShuffle')

    try {
      // First fetch the current state to toggle it
      // const response = await fetch(`${apiBase}/now-playing`) // TODO move to player
      // const data = await response.json()

      const data = {
        // shuffle: true, // or false
        shuffle: isShuffle.value, // TODO get from response data
      }

      if (data.shuffle !== undefined) {
        // Send the opposite of the current shuffle state
        return await sendCommand(`set_random:${!data.shuffle}`).then(() => {
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
   * @returns {Promise<boolean>} Success or failure
   */

  // TODO fix Promise<string | boolean>, leave only boolean
  async function cycleLoopMode(): Promise<string | boolean> {
    // currentData: currentData, // getting from the State
    // playerName: string | null = null,
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

    return await sendCommand(`set_loop:${nextMode}`).then(() => {
      currentLoopMode.value = nextMode // TODO get current state from BE

      console.log('currentLoopMode', currentLoopMode.value)

      return true
    })
  }

  /**
   * Send a seek command to the player
   * @param {number} position - The position to seek to in seconds
   * @returns {void} Success or failure
   */
  function seekToPosition(position: number): void {
    try {
      stopAutoProgress()

      if (!currentData.value?.song?.duration) {
        console.error('Error seeking to position: No Song duration')

        return
      }

      const seekToPosition = (currentData.value.song.duration * position) / 100

      console.log('seekToPosition', seekToPosition)

      const seekCommand = `seek:${Math.floor(seekToPosition)}`

      sendCommand(seekCommand).then(() => {
        if (isPlaying.value && currentSong.value?.duration) {
          startAutoProgress()
        }
      })
    } catch (error) {
      stopAutoProgress()

      console.error('Error seeking to position:', error)
    }
  }

  const lastProgressUpdate = ref<number | null>(null)
  const progressInterval = 100 // 100 ms

  function startAutoProgress() {
    console.log('startAutoProgress')

    stopAutoProgress()

    if (isPlaying.value && currentSong.value?.duration) {
      // Reset the timestamp to now
      lastProgressUpdate.value = Date.now()

      const duration = currentSong.value.duration

      progressIntervalID.value = setInterval(() => {
        // Calculate how much time has passed since the last position update
        const now = Date.now()
        const elapsedSeconds = (now - (lastProgressUpdate.value || 0)) / 1000
        lastProgressUpdate.value = now

        const delta = +((elapsedSeconds / duration) * 100).toFixed(9) // + 0.0808 (%) ... every 100ms

        seekPosition.value = +(seekPosition.value + delta).toFixed(9) // 48.3168 (%) ...

        if (seekPosition.value >= 100) {
          stopAutoProgress()

          sendCommand('stop')
        }
      }, progressInterval)
    } else {
      stopAutoProgress()
    }
  }

  function stopAutoProgress() {
    if (progressIntervalID.value) {
      console.log('clearInterval')

      clearInterval(progressIntervalID.value)
      progressIntervalID.value = undefined
    }
  }

  return {
    // State
    isPlaying,
    isPaused,
    seekPosition,
    // currentData,
    progressIntervalID,
    canShuffle,
    isShuffle,
    canLoop,
    currentLoopMode,
    // Getters
    isPlayingOrPaused,
    songDurationTime,
    seekPositionTime,
    // Actions
    togglePlayPause,
    playNextOrPrev,
    toggleShuffle,
    cycleLoopMode,
    seekToPosition,
    startAutoProgress,
    stopAutoProgress,
  }
})
