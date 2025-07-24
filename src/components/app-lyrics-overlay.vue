<template>
  <div v-if="isVisible" class="lyrics-overlay" @click="close">
    <div class="lyrics-overlay__content" @click.stop>
      <div class="lyrics-overlay__header">
        <h3>Lyrics</h3>
        <button class="lyrics-overlay__close" @click="close">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="lyrics-overlay__body" ref="lyricsContainer">
        <div v-if="loading" class="lyrics-overlay__loading">
          Loading lyrics...
        </div>

        <div v-else-if="error" class="lyrics-overlay__error">
          {{ error }}
        </div>

        <div v-else-if="lyrics" class="lyrics-overlay__lyrics">
          <div
            v-for="(line, index) in lyrics.lyrics"
            :key="index"
            :ref="(el) => { if (el) lyricsRefs[index] = el as HTMLElement }"
            class="lyrics-line"
            :class="{ 'lyrics-line--current': isCurrentLineByIndex(index) }"
          >
            {{ line.text }}
          </div>
        </div>

        <div v-else class="lyrics-overlay__no-lyrics">
          No lyrics available
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { usePlayerPosition } from '@/composables/usePlayerPosition'
import { rewriteAudiocontrolApiUrl } from '@/api/utils'
import type { Song } from '@/types/player'

interface LyricsLine {
  timestamp: number
  text: string
}

interface LyricsData {
  type: string
  lyrics: LyricsLine[]
}

interface LyricsResponse {
  found: boolean
  lyrics?: LyricsData
}

const props = defineProps<{
  isVisible: boolean
  song?: Song | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { position: currentTime, updatePosition } = usePlayerPosition()
const lyrics = ref<LyricsData | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const lyricsContainer = ref<HTMLElement | null>(null)
const lyricsRefs = ref<Record<number, HTMLElement>>({})

// Update position and trigger scroll if needed
const updateCurrentTime = () => {
  const previousTime = currentTime.value
  updatePosition()

  // Only trigger scroll if the time actually changed and lyrics are timed
  const timeChanged = Math.abs(previousTime - currentTime.value) > 0.01
  const lyricsAreTimed = areTimedLyrics()

  if (timeChanged && lyricsAreTimed) {
    scrollToCurrentLine()
  }
}

// Get the current line index (computed for reactivity)
const currentLineIndex = computed((): number => {
  if (!lyrics.value?.lyrics) return -1

  // Find the latest line whose timestamp is less than or equal to current time
  let currentIndex = -1

  for (let i = 0; i < lyrics.value.lyrics.length; i++) {
    const line = lyrics.value.lyrics[i]
    if (line.timestamp <= currentTime.value) {
      currentIndex = i
    } else {
      break // Stop at the first line that's beyond current time
    }
  }

  return currentIndex
})

// Get the current line index (legacy function, now uses computed)
const getCurrentLineIndex = (): number => {
  return currentLineIndex.value
}

// Check if lyrics are timed (have varying timestamps) or untimed (all timestamps are 0)
const areTimedLyrics = (): boolean => {
  if (!lyrics.value?.lyrics || lyrics.value.lyrics.length === 0) return false

  // Check if any line has a timestamp different from 0
  return lyrics.value.lyrics.some(line => line.timestamp !== 0)
}

// Check if a lyrics line is currently being sung (by index - more reliable)
const isCurrentLineByIndex = (lineIndex: number): boolean => {
  if (!lyrics.value?.lyrics) return false

  // Don't highlight anything if lyrics are untimed
  if (!areTimedLyrics()) return false

  const currentIndex = currentLineIndex.value // Use computed property for reactivity
  const isActive = currentIndex === lineIndex

  return isActive
}

// Scroll to current line with smart positioning
const scrollToCurrentLine = () => {
  if (!lyricsContainer.value || !lyrics.value?.lyrics) {
    return
  }

  const currentIndex = getCurrentLineIndex()
  
  if (currentIndex === -1) {
    return
  }

  const currentLineElement = lyricsRefs.value[currentIndex]
  if (!currentLineElement) {
    return
  }

  // Get the main popup content element for better comfort zone calculation
  const contentElement = lyricsContainer.value.closest('.lyrics-overlay__content')
  if (!contentElement) {
    return
  }

  const containerRect = lyricsContainer.value.getBoundingClientRect()
  const contentRect = contentElement.getBoundingClientRect()
  const lineRect = currentLineElement.getBoundingClientRect()

  // Use the content element height for comfort zone calculation
  const contentHeight = contentElement.clientHeight
  const containerHeight = lyricsContainer.value.clientHeight
  const lineHeight = currentLineElement.clientHeight

  // Define comfort zones based on the entire popup content height
  // This positions the line in the upper portion of the popup window
  const topComfortZone = contentHeight * 0.1 // Top 10% of entire popup
  const bottomComfortZone = contentHeight * 0.4 // Bottom 40% of entire popup

  // Calculate line position relative to the scrollable container
  const relativeTop = lineRect.top - containerRect.top
  const relativeBottom = lineRect.bottom - containerRect.top

  // Calculate line position relative to the entire popup content
  const lineTopRelativeToContent = lineRect.top - contentRect.top
  const lineBottomRelativeToContent = lineRect.bottom - contentRect.top

  let shouldScroll = false
  let scrollTarget = 0

  // Check if line is outside visible area or not optimally positioned relative to entire popup
  if (relativeTop < 0) {
    // Line is above visible area
    shouldScroll = true
    scrollTarget = currentLineElement.offsetTop - topComfortZone
  } else if (relativeBottom > containerHeight) {
    // Line is below visible area
    shouldScroll = true
    scrollTarget = currentLineElement.offsetTop - bottomComfortZone + lineHeight
  } else if (lineTopRelativeToContent < topComfortZone) {
    // Line is too high in the popup - scroll up to center it better
    shouldScroll = true
    scrollTarget = currentLineElement.offsetTop - topComfortZone
  } else if (lineBottomRelativeToContent > bottomComfortZone) {
    // Line is too low in the popup - scroll down to center it better
    shouldScroll = true
    scrollTarget = currentLineElement.offsetTop - bottomComfortZone + lineHeight
  }

  if (shouldScroll) {
    // Ensure scroll target is within bounds
    const maxScroll = lyricsContainer.value.scrollHeight - containerHeight
    scrollTarget = Math.max(0, Math.min(scrollTarget, maxScroll))
    
    lyricsContainer.value.scrollTo({
      top: scrollTarget,
      behavior: 'smooth'
    })
  }
}

// Fetch lyrics from API
const fetchLyrics = async (lyricsUrl: string) => {
  if (!lyricsUrl) return

  loading.value = true
  error.value = null

  try {
    // Use the same URL rewriting logic as cover art URLs
    const rewrittenUrl = rewriteAudiocontrolApiUrl(lyricsUrl)
    const response = await fetch(rewrittenUrl)
    const data: LyricsResponse = await response.json()

    if (data.found && data.lyrics) {
      lyrics.value = data.lyrics
    } else {
      error.value = 'No lyrics found for this song'
    }
  } catch (err) {
    error.value = 'Failed to load lyrics'
    console.error('Error fetching lyrics:', err)
  } finally {
    loading.value = false
  }
}

// Close overlay
const close = () => {
  emit('close')
}

// Handle escape key to close overlay
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.isVisible) {
    close()
  }
}

// Watch for song changes
watch(() => props.song?.metadata?.lyrics_url, (newLyricsUrl) => {
  if (newLyricsUrl && props.isVisible) {
    fetchLyrics(newLyricsUrl)
  }
}, { immediate: true })

// Watch for visibility changes
watch(() => props.isVisible, (isVisible) => {
  if (isVisible && props.song?.metadata?.lyrics_url) {
    fetchLyrics(props.song.metadata.lyrics_url)
  } else {
    lyrics.value = null
    error.value = null
    lyricsRefs.value = {} // Clear refs when overlay closes
  }
})

// Watch for lyrics changes to reset refs
watch(() => lyrics.value, () => {
  lyricsRefs.value = {} // Reset refs when new lyrics load
})

// Set up interval to update current time
let timeInterval: number | null = null

onMounted(() => {
  timeInterval = window.setInterval(updateCurrentTime, 100)
  // Add escape key listener
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
  // Remove escape key listener
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped lang="scss">
.lyrics-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;

  &__content {
    background: var(--background-main-content);
    border-radius: 12px;
    width: 100%;
    max-width: 600px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--color-header-border);

    h3 {
      margin: 0;
      color: var(--color-head);
      font-size: 20px;
      font-weight: 600;
    }
  }

  &__close {
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: 6px;
    color: var(--color-icon);
    transition: all 0.2s ease;

    &:hover {
      background-color: var(--color-header-border);
      color: var(--color-head);
    }

    svg {
      width: 20px;
      height: 20px;
    }
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    min-height: 200px;
  }

  &__loading,
  &__error,
  &__no-lyrics {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: var(--color-text);
    text-align: center;
  }

  &__error {
    color: var(--primary);
  }

  &__lyrics {
    .lyrics-line {
      padding: 8px 0;
      line-height: 1.6;
      color: var(--color-text);
      font-size: 16px;
      transition: all 0.3s ease;
      border-radius: 4px;
      padding-left: 12px;
      padding-right: 12px;

      &--current {
        background-color: var(--cover-placeholder-bg);
        color: var(--primary);
        font-weight: 600;
        transform: scale(1.02);
      }

      &:empty {
        height: 20px;
      }
    }
  }
}

@media (max-width: 768px) {
  .lyrics-overlay {
    padding: 10px;

    &__content {
      max-height: 90vh;
    }

    &__header {
      padding: 16px 20px;
    }

    &__body {
      padding: 20px;
    }

    &__lyrics .lyrics-line {
      font-size: 15px;
      padding: 6px 8px;
    }
  }
}
</style>
