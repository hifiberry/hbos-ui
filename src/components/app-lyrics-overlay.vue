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

      <div class="lyrics-overlay__body">
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
            class="lyrics-line"
            :class="{ 'lyrics-line--current': isCurrentLine(line.timestamp) }"
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
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '@/stores/player'
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

const playerStore = usePlayerStore()
const lyrics = ref<LyricsData | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const currentTime = ref(0)

// Update current time from player
const updateCurrentTime = () => {
  currentTime.value = playerStore.currentData?.position || 0
}

// Check if a lyrics line is currently being sung
const isCurrentLine = (timestamp: number): boolean => {
  if (!lyrics.value?.lyrics) return false

  const currentIndex = lyrics.value.lyrics.findIndex((line, index) => {
    const nextLine = lyrics.value!.lyrics[index + 1]
    return timestamp <= currentTime.value && (!nextLine || currentTime.value < nextLine.timestamp)
  })

  return lyrics.value.lyrics.findIndex(line => line.timestamp === timestamp) === currentIndex
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
  }
})

// Set up interval to update current time
let timeInterval: number | null = null

onMounted(() => {
  timeInterval = window.setInterval(updateCurrentTime, 100)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
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
