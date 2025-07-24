import { ref, computed, watch } from 'vue'
import { usePlayerStore } from '@/stores/player'

/**
 * Composable for tracking player position with smooth local calculation
 *
 * This composable provides real-time player position tracking that works similarly
 * to progress bars - it calculates position based on elapsed time when playing,
 * rather than relying on frequent backend polling.
 *
 * Features:
 * - Smooth position updates during playback
 * - Automatic sync with player state changes
 * - Efficient performance with minimal API calls
 * - Consistent behavior across components
 *
 * Usage:
 * ```ts
 * const { position, isPlaying, duration, updatePosition } = usePlayerPosition()
 *
 * // Start an interval to update position
 * setInterval(updatePosition, 100)
 *
 * // Use reactive position value
 * watch(position, (newPos) => {
 *   console.log('Current position:', newPos)
 * })
 * ```
 */
export function usePlayerPosition() {
  const playerStore = usePlayerStore()

  // Track when we last synced with the player
  const lastSyncTime = ref(0)
  const lastPlayerPosition = ref(0)
  const lastPlayerState = ref<string>('stopped')

  // Current calculated position
  const currentPosition = ref(0)

  // Calculate current position based on player state and elapsed time
  const calculateCurrentPosition = (): number => {
    const playerData = playerStore.currentData
    if (!playerData) return 0

    // If player state or position changed, update our sync point
    if (playerData.state !== lastPlayerState.value ||
        Math.abs((playerData.position || 0) - lastPlayerPosition.value) > 0.5) { // Allow 0.5s tolerance
      lastSyncTime.value = performance.now()
      lastPlayerPosition.value = playerData.position || 0
      lastPlayerState.value = playerData.state || 'stopped'
    }

    // If playing, calculate position based on elapsed time
    if (playerData.state === 'playing') {
      const elapsedMs = performance.now() - lastSyncTime.value
      const elapsedSeconds = elapsedMs / 1000
      return lastPlayerPosition.value + elapsedSeconds
    }

    // If paused or stopped, return the last known position
    return lastPlayerPosition.value
  }

  // Update current position
  const updatePosition = () => {
    const newPosition = calculateCurrentPosition()
    currentPosition.value = newPosition
    return newPosition
  }

  // Watch for player state/position changes to sync our calculation
  watch(() => [playerStore.currentData?.state, playerStore.currentData?.position], () => {
    updatePosition()
  }, { immediate: true })

  // Computed property for reactive access
  const position = computed(() => currentPosition.value)

  // Player state helpers
  const isPlaying = computed(() => playerStore.currentData?.state === 'playing')
  const isPaused = computed(() => playerStore.currentData?.state === 'paused')
  const isStopped = computed(() => playerStore.currentData?.state === 'stopped')

  // Duration from player data
  const duration = computed(() => {
    const songDuration = playerStore.currentData?.song?.metadata?.lyrics_metadata?.duration
    if (typeof songDuration === 'string') {
      return parseFloat(songDuration)
    }
    return songDuration || 0
  })

  return {
    // Position tracking
    position,
    updatePosition,

    // Player state
    isPlaying,
    isPaused,
    isStopped,

    // Song info
    duration,

    // Raw player data access
    playerData: computed(() => playerStore.currentData)
  }
}
