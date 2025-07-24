import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'

import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { usePlayerPosition } from '@/composables/usePlayerPosition'

import { formatTime } from '@/helpers/formatTime'

import type { LoopMode } from '@/types/player'

function isLoopMode(value: string): value is Exclude<LoopMode, undefined> {
  return ['no', 'none', 'song', 'track', 'playlist'].includes(value)
}

export const useAudioControls = defineStore('audio-controls', () => {
  const playerStore = usePlayerStore()
  const { fetchCurrentPlayer, sendCommand } = playerStore
  const { currentData, currentSong } = storeToRefs(playerStore)
  
  // Use the shared player position composable
  const { position: currentPosition, updatePosition } = usePlayerPosition()

  // State
  const progressIntervalID = ref<number | undefined>(undefined)

  // Computed seek position as percentage
  const seekPosition = computed(() => {
    if (!currentSong.value?.duration) return 0
    return (currentPosition.value / currentSong.value.duration) * 100
  })

  // Getters
  const isPlaying = computed(() => currentData.value?.state === 'playing')
  const isPaused = computed(() => currentData.value?.state === 'paused')
  const isPlayingOrPaused = computed(() => isPlaying.value || isPaused.value) // not used as we don't have Stop button

  const isShuffle = computed(() => currentData.value?.shuffle)

  // Check the loop mode value case-insensitively since API might use different cases
  const currentLoopMode = computed(() => {
    const mode = (currentData.value?.loop_mode || 'none').toLowerCase()

    return isLoopMode(mode) ? mode : 'none'
  })

  const iscurrentLoopModeNone = computed(
    () => currentLoopMode.value === 'none' || currentLoopMode.value === 'no',
  )
  const iscurrentLoopModeTrack = computed(
    () => currentLoopMode.value === 'track' || currentLoopMode.value === 'song',
  )
  const iscurrentLoopModePlaylist = computed(() => currentLoopMode.value === 'playlist')

  const songDurationTime = computed(() => formatTime(currentSong.value?.duration))
  const seekPositionTime = computed(() =>
    formatTime(((currentSong.value?.duration || 0) * (seekPosition.value || 0)) / 100),
  )

  // Start/stop the position update interval based on play state
  watch(
    () => currentData.value?.state,
    (newState) => {
      console.log('Player state changed to:', newState)

      if (newState === 'playing' && !progressIntervalID.value) {
        startAutoProgress()
      } else if (newState !== 'playing' && progressIntervalID.value) {
        stopAutoProgress()
      }
    },
    { immediate: true },
  )

  // Actions
  const togglePlayPause = () => {
    const command = isPlaying.value ? 'pause' : 'play'

    stopAutoProgress()

    // Playback commands go to active player
    sendCommand(command)
  }

  const playNextOrPrev = (nextOrPrev: string) => {
    console.log('playNextOrPrev', nextOrPrev)

    // Playback commands go to active player
    sendCommand(nextOrPrev)
  }

  const toggleShuffle = () => {
    console.log('toggleShuffle')

    if (isShuffle.value !== undefined) {
      // can be undefined if can't Shuffle
      // Playback state commands go to active player
      sendCommand(`set_random:${!isShuffle.value}`)
    }
  }

  async function cycleLoopMode() {
    console.log('cycleLoopMode currentLoopMode', currentLoopMode.value)

    if (!currentData.value) return

    let nextMode: string | undefined

    switch (currentLoopMode.value) {
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

    // Playback state commands go to active player
    sendCommand(`set_loop:${nextMode}`)
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

      // Seek commands go to active player
      sendCommand(seekCommand)
      sendCommand('play')
    } catch (error) {
      stopAutoProgress()

      console.error('Error seeking to position:', error)
    }
  }

  function startAutoProgress() {
    console.log('startAutoProgress')

    stopAutoProgress()

    if (isPlaying.value && currentSong.value?.duration) {
      progressIntervalID.value = setInterval(() => {
        updatePosition()
        
        // Check if we've reached the end
        if (seekPosition.value >= 100) {
          stopAutoProgress()
          console.log('Track reached the end, fetching current player state from server')
          fetchCurrentPlayer()
        }
      }, 100) // 100ms interval
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
    seekPosition,
    progressIntervalID,
    // Getters
    isPlaying,
    isPaused,
    isPlayingOrPaused,
    isShuffle,
    currentLoopMode,
    iscurrentLoopModeNone,
    iscurrentLoopModeTrack,
    iscurrentLoopModePlaylist,
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
