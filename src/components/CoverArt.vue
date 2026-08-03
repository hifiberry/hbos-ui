<!--
  Simple Cover Art component that can be easily integrated into existing components
  Shows cover art with automatic fallback from song to artist images
-->
<template>
  <div class="cover-art" :class="[
    { loading: isLoading, 'has-cover': !!displayUrl },
    size,
    { 'container-sized': adaptToContainer }
  ]">
    <div v-if="isLoading" class="cover-placeholder loading-state">
      <div class="loading-spinner"></div>
    </div>

    <img
      v-else-if="displayUrl"
      :key="displayUrl"
      :src="displayUrl"
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
import { computed, ref, watch, onMounted } from 'vue'
import { useCoverArt } from '@/composables/useCoverArt'
import type { Song } from '@/types/player'

interface Props {
  song?: Song | null
  size?: 'small' | 'medium' | 'large'
  autoLoad?: boolean
  showSource?: boolean
  adaptToContainer?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  autoLoad: true,
  showSource: false,
  adaptToContainer: false
})

const emit = defineEmits<{
  loaded: [result: { success: boolean; urls: string[]; source: string }]
  error: [error: string]
}>()

// Use the cover art composable
const {
  loading: isLoading,
  coverArtUrls,
  coverArtSource,
  loadCoverArt,
  loadCoverArtFromAPI,
  clearCoverArt,
  clearCache
} = useCoverArt()

// URLs that the browser could not load, plus URLs discovered while falling back.
// Both are reset whenever the song changes.
const failedUrls = ref<string[]>([])
const fallbackUrls = ref<string[]>([])
const fallbackRunning = ref(false)
const fallbackExhausted = ref(false)
const apiFallbackTried = ref(false)

// Candidates in preference order, minus everything already known to be broken.
const candidateUrls = computed(() =>
  [...coverArtUrls.value, ...fallbackUrls.value].filter(url => url && !failedUrls.value.includes(url))
)

// The URL currently shown. Advancing through the candidates is what makes a
// failed image move on instead of being requested over and over again.
const displayUrl = computed(() => candidateUrls.value[0] || null)

const resetFallbackState = () => {
  failedUrls.value = []
  fallbackUrls.value = []
  fallbackRunning.value = false
  fallbackExhausted.value = false
  apiFallbackTried.value = false
}

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
  resetFallbackState()

  if (!props.song) {
    clearCoverArt()
    return
  }

  console.log('🎵 Loading cover art for song:', props.song.title, 'by', props.song.artist)
  console.log('🎵 Song has cover_art_url:', props.song.cover_art_url)
  console.log('🎵 Song has artwork_url:', props.song.artwork_url)
  console.log('🎵 Song metadata:', props.song.metadata)

  // Always try to load cover art - let the service decide if it can find anything
  try {
    const result = await loadCoverArt(props.song)
    console.log('✅ Cover art loaded successfully:', result)
    emit('loaded', result)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load cover art'
    console.log('❌ Cover art loading failed:', errorMessage)
    emit('error', errorMessage)
  }
}

const onImageError = async (event: Event) => {
  const img = event.target as HTMLImageElement
  // Use the src attribute, not img.src: the attribute holds the candidate URL
  // as we know it, while img.src has been resolved to an absolute URL.
  const brokenUrl = img.getAttribute('src')

  // A URL we have already given up on - nothing left to do for this event.
  if (!brokenUrl || failedUrls.value.includes(brokenUrl)) return

  console.warn('🚨 Cover art image failed to load:', brokenUrl)
  failedUrls.value = [...failedUrls.value, brokenUrl]

  // Another candidate is available - it renders instead, no retry of the broken one.
  if (displayUrl.value) return

  // Every known candidate failed. Look for alternatives exactly once per song.
  if (!props.song || fallbackRunning.value || fallbackExhausted.value) {
    emit('error', `Failed to load image: ${brokenUrl}`)
    return
  }

  fallbackRunning.value = true
  try {
    // The provider lookup depends only on the song, so it is worth doing once.
    if (!apiFallbackTried.value) {
      apiFallbackTried.value = true
      console.log('📡 Existing cover art failed to load, trying API fallback...')
      try {
        const result = await loadCoverArtFromAPI(props.song)
        if (displayUrl.value) {
          console.log('✅ Found fallback cover art via API:', result)
          emit('loaded', result)
          return
        }
        console.log('❌ No results from API fallback')
      } catch (err) {
        console.warn('❌ Fallback cover art loading failed:', err)
      }
    }

    // Last resort: check for coverart_url or logo_url in the metadata field.
    // These are added as candidates directly - routing them back through
    // loadCoverArt() would only hit the song cache and return the broken URL.
    if (props.song.metadata && typeof props.song.metadata === 'object') {
      const metadata = props.song.metadata as Record<string, unknown>

      // Check for coverart_url first, then logo_url
      const metadataCoverUrl = metadata.coverart_url || metadata.logo_url
      const sourceType = metadata.coverart_url ? 'coverart_url' : 'logo_url'

      if (typeof metadataCoverUrl === 'string' && metadataCoverUrl &&
          !failedUrls.value.includes(metadataCoverUrl)) {
        console.log('🎯 Using metadata.' + sourceType + ' as last resort:', metadataCoverUrl)
        fallbackUrls.value = [...fallbackUrls.value, metadataCoverUrl]
        const fallbackResult = {
          success: true,
          urls: [metadataCoverUrl],
          source: 'song',
          providers: [{ name: 'metadata_fallback', display_name: 'Metadata Fallback (' + sourceType + ')' }]
        }
        emit('loaded', fallbackResult)
        return
      }
    }

    // Nothing left to try - show the placeholder instead of requesting again.
    fallbackExhausted.value = true
    console.log('💀 All fallback options exhausted for:', brokenUrl)
    emit('error', `Failed to load image: ${brokenUrl}`)
  } finally {
    fallbackRunning.value = false
  }
}

const onImageLoad = () => {
  // Image loaded successfully
}

// Watch for song changes using deep comparison of content, not object reference
watch(
  () => {
    if (!props.song) return null
    return {
      title: props.song.title || '',
      artist: props.song.artist || '',
      album: props.song.album || ''
    }
  },
  (newSongData, oldSongData) => {
    // Only load if song data actually changed or this is the first time
    const hasChanged = !oldSongData ||
      newSongData?.title !== oldSongData.title ||
      newSongData?.artist !== oldSongData.artist ||
      newSongData?.album !== oldSongData.album

    if (props.autoLoad && hasChanged) {
      loadCoverArtForSong()
    }
  },
  { immediate: true, deep: true }
)

// Expose methods for manual control
defineExpose({
  loadCoverArt: loadCoverArtForSong,
  clearCoverArt,
  clearCache
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

  /* Ensure square aspect ratio is maintained */
  aspect-ratio: 1 / 1;
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

/* When used in containers that control the size, adapt to container */
.cover-art.container-sized {
  width: 100%;
  height: 100%;
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
