<!--
  Simple Cover Art component that can be easily integrated into existing components
  Shows cover art with automatic fallback from song to artist images
-->
<template>
  <div class="cover-art" :class="{ loading: isLoading, 'has-cover': hasCoverArt }">
    <div v-if="isLoading" class="cover-placeholder loading-state">
      <div class="loading-spinner"></div>
    </div>

    <img
      v-else-if="hasCoverArt && bestCoverArt"
      :src="bestCoverArt"
      :alt="imageAlt"
      :class="['cover-image', `source-${coverArtSource}`]"
      @error="onImageError"
      @load="onImageLoad"
    />

    <div v-else class="cover-placeholder no-cover">
      <slot name="placeholder">
        <div class="default-placeholder">
          <svg viewBox="0 0 24 24" class="music-icon">
            <path d="M12,3V13.55C11.41,13.21 10.73,13 10,13A3,3 0 0,0 7,16A3,3 0 0,0 10,19A3,3 0 0,0 13,16V7H19V5H12.5V3H12Z" />
          </svg>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useCoverArt } from '@/composables/useCoverArt'
import type { Song } from '@/types/player'

interface Props {
  song?: Song | null
  size?: 'small' | 'medium' | 'large'
  autoLoad?: boolean
  showSource?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  autoLoad: true,
  showSource: false
})

const emit = defineEmits<{
  loaded: [result: { success: boolean; urls: string[]; source: string }]
  error: [error: string]
}>()

// Use the cover art composable
const {
  loading: isLoading,
  hasCoverArt,
  bestCoverArt,
  coverArtSource,
  loadCoverArt,
  loadCoverArtFromAPI,
  clearCoverArt
} = useCoverArt()

// Computed properties
const imageAlt = computed(() => {
  if (!props.song) return 'Cover art'

  const parts = []
  if (props.song.title) parts.push(props.song.title)
  if (props.song.artist) parts.push(`by ${props.song.artist}`)
  if (props.song.album) parts.push(`from ${props.song.album}`)

  return parts.length > 0 ? `Cover art for ${parts.join(' ')}` : 'Cover art'
})

// Methods
const loadCoverArtForSong = async () => {
  if (!props.song) {
    clearCoverArt()
    return
  }

  try {
    const result = await loadCoverArt(props.song)
    emit('loaded', result)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load cover art'
    emit('error', errorMessage)
  }
}

const onImageError = async (event: Event) => {
  const img = event.target as HTMLImageElement
  console.warn('Failed to load cover art image:', img.src)

  // If we failed to load an existing cover art URL, try to find alternatives via API
  if (props.song && coverArtSource.value === 'song') {
    console.log('Existing cover art failed to load, trying API fallback...')

    try {
      const result = await loadCoverArtFromAPI(props.song)
      if (result.success && result.urls.length > 0) {
        console.log('Found fallback cover art via API:', result)
        emit('loaded', result)
        return
      }
    } catch (err) {
      console.warn('Fallback cover art loading failed:', err)
    }
  }

  emit('error', `Failed to load image: ${img.src}`)
}

const onImageLoad = () => {
  // Image loaded successfully
}

// Watch for song changes
watch(
  () => props.song,
  () => {
    if (props.autoLoad) {
      loadCoverArtForSong()
    }
  },
  { immediate: true }
)

// Expose methods for manual control
defineExpose({
  loadCoverArt: loadCoverArtForSong,
  clearCoverArt
})

// Auto-load on mount if enabled
onMounted(() => {
  if (props.autoLoad && props.song) {
    loadCoverArtForSong()
  }
})
</script>

<style scoped>
.cover-art {
  position: relative;
  display: inline-block;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f5;
  transition: all 0.3s ease;
}

/* Size variants */
.cover-art {
  width: 200px;
  height: 200px;
}

.cover-art.small {
  width: 100px;
  height: 100px;
}

.cover-art.medium {
  width: 200px;
  height: 200px;
}

.cover-art.large {
  width: 300px;
  height: 300px;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: opacity 0.3s ease;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.loading-state {
  background: #e0e0e0;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #ccc;
  border-top: 2px solid #666;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.no-cover {
  background: #f0f0f0;
  color: #999;
}

.default-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.music-icon {
  width: 32px;
  height: 32px;
  fill: #ccc;
  opacity: 0.6;
}

/* Source-specific styling (optional) */
.source-artist {
  opacity: 0.9;
}

.source-song {
  opacity: 1;
}

/* Loading state */
.cover-art.loading {
  pointer-events: none;
}

.cover-art.loading .cover-image {
  opacity: 0.7;
}

/* Hover effects */
.cover-art:hover .cover-image {
  transform: scale(1.02);
  transition: transform 0.2s ease;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .cover-art.large {
    width: 250px;
    height: 250px;
  }

  .cover-art.medium {
    width: 150px;
    height: 150px;
  }
}
</style>
