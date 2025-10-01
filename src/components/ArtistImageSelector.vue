<template>
  <div v-if="isVisible" class="artist-image-selector-overlay" @click="closeModal">
    <div class="artist-image-selector" @click.stop>
      <div class="modal-header">
        <h3>Select Artist Image for {{ artistName }}</h3>
        <button class="close-btn" @click="closeModal">
          <AppIcon icon="clear" />
        </button>
      </div>

      <div class="modal-content">
        <div v-if="loading" class="loading-state">
          <AppIcon icon="loading" class="loading-spinner" />
          <p>Loading artist images...</p>
        </div>

        <div v-else-if="error" class="error-state">
          <p>{{ error }}</p>
          <button class="retry-btn" @click="fetchArtistImages">
            <AppIcon icon="refresh" />
            Retry
          </button>
        </div>

        <div v-else-if="artistImages.length === 0" class="no-images-state">
          <AppIcon icon="image" class="no-images-icon" />
          <h4>No images found</h4>
          <p>No artist images were found for "{{ artistName }}"</p>
        </div>

        <div v-else class="images-grid">
          <div
            v-for="(image, index) in artistImages"
            :key="index"
            class="image-item"
            @click="selectImage(image.url)"
          >
            <img
              :src="image.url"
              :alt="`${artistName} - Image ${index + 1}`"
              loading="lazy"
              @error="onImageError"
            />
            <div class="image-overlay">
              <div class="provider-badge">{{ image.provider }}</div>
              <div v-if="image.width && image.height" class="resolution-badge">
                {{ image.width }}×{{ image.height }}
                <span v-if="image.size_bytes" class="size-info">
                  ({{ formatFileSize(image.size_bytes) }})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { coverArtLoader } from '@/services/coverartloader'
import type { CoverArtApiResponse } from '@/services/coverartloader'

interface Props {
  isVisible: boolean
  artistName: string
}

interface Emits {
  (e: 'close'): void
  (e: 'select', imageUrl: string): void
}

interface ArtistImage {
  url: string
  provider: string
  width?: number
  height?: number
  size_bytes?: number
  format?: string
  grade?: number
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// State
const loading = ref(false)
const error = ref<string | null>(null)
const artistImages = ref<ArtistImage[]>([])

// Fetch artist images from the cover art API
const fetchArtistImages = async () => {
  if (!props.artistName) return

  loading.value = true
  error.value = null
  artistImages.value = []

  try {
    console.log(`Fetching artist images for: ${props.artistName}`)
    const response: CoverArtApiResponse = await coverArtLoader.getArtistCoverArt(props.artistName)

    if (!response.results || response.results.length === 0) {
      artistImages.value = []
      return
    }

    // Extract all images from all providers
    const images: ArtistImage[] = []
    response.results.forEach(result => {
      result.images.forEach(image => {
        // Filter out images with grade < -10
        if (image.grade !== undefined && image.grade < -10) {
          console.log(`Skipping image with low grade (${image.grade}):`, image.url)
          return
        }

        images.push({
          url: image.url,
          provider: result.provider.display_name || result.provider.name,
          width: image.width,
          height: image.height,
          size_bytes: image.size_bytes,
          format: image.format,
          grade: image.grade
        })
      })
    })

    // Sort images by grade (highest first), fallback to provider name for consistent ordering
    images.sort((a, b) => {
      // Primary sort: by grade (highest first)
      if (a.grade !== undefined && b.grade !== undefined) {
        if (a.grade !== b.grade) {
          return b.grade - a.grade // Descending order
        }
      } else if (a.grade !== undefined) {
        return -1 // a has grade, b doesn't - a comes first
      } else if (b.grade !== undefined) {
        return 1 // b has grade, a doesn't - b comes first
      }

      // Secondary sort: by provider name for consistent ordering
      return a.provider.localeCompare(b.provider)
    })

    artistImages.value = images
    console.log(`Found ${images.length} artist images`)
  } catch (err) {
    console.error('Error fetching artist images:', err)
    error.value = 'Failed to load artist images. Please try again.'
  } finally {
    loading.value = false
  }
}

// Watch for visibility changes to fetch images
watch(() => props.isVisible, (newVisible) => {
  if (newVisible && props.artistName) {
    fetchArtistImages()
  }
}, { immediate: true })

// Handle keyboard events
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.isVisible) {
    closeModal()
  }
}

// Add/remove keyboard event listeners
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// Select an image and immediately confirm
const selectImage = (imageUrl: string) => {
  emit('select', imageUrl)
  closeModal()
}

// Close modal
const closeModal = () => {
  emit('close')
}

// Format file size for display
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Handle image load errors
const onImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}
</script>

<style scoped lang="scss">
@use '@/assets/scss/popup' as *;

.artist-image-selector-overlay {
  @include popup-overlay;
}

.artist-image-selector {
  @include popup-container(800px);
}

.modal-header {
  @include popup-header;

  .close-btn {
    @include popup-close-button;
  }
}

.modal-content {
  @include popup-content;
  min-height: 400px;
  overflow-y: auto;
}

.loading-state,
.error-state,
.no-images-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  text-align: center;
  color: var(--color-body-secondary);

  .loading-spinner {
    width: 40px;
    height: 40px;
    margin-bottom: 16px;
    animation: spin 1s linear infinite;
  }

  .no-images-icon {
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  h4 {
    margin: 0 0 8px 0;
    color: var(--color-body-primary);
  }

  p {
    margin: 0;
  }
}

.retry-btn {
  margin-top: 16px;
  padding: 8px 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: var(--color-primary-hover);
  }

  svg {
    width: 16px;
    height: 16px;
  }
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

    .image-overlay {
      opacity: 1;
    }
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.6) 0%,
      transparent 40%,
      transparent 60%,
      rgba(0, 0, 0, 0.6) 100%
    );
    opacity: 0;
    transition: opacity 0.2s ease;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 8px;
  }

  .provider-badge {
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    align-self: flex-start;
  }

  .resolution-badge {
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 400;
    align-self: flex-start;
    margin-top: 4px;

    .size-info {
      display: block;
      font-size: 0.65rem;
      opacity: 0.8;
      margin-top: 2px;
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
