<template>
  <div class="album">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'artists' }">Artists</AppBackRouter>
    </div>

    <div class="card">
      <!-- Artist Info Section -->
      <div v-if="artistByName" class="artist-info">
        <div class="artist-image">
          <div
            class="artist-img-container"
            @mouseenter="showEditIcon = true"
            @mouseleave="showEditIcon = false"
          >
            <img
              v-if="artistImageUrl"
              :src="artistImageUrl"
              :alt="artistByName.name"
              class="artist-img"
            />
            <div v-else class="artist-img-placeholder">
              <span>{{ artistByName.name.charAt(0).toUpperCase() }}</span>
            </div>

            <!-- Edit Icon Overlay -->
            <div
              v-show="showEditIcon"
              class="artist-img-edit-overlay"
              @click="openImageSelector"
            >
              <AppIcon icon="edit" />
            </div>
          </div>
        </div>
        <div class="artist-details">
          <div class="artist-header">
            <h1 class="artist-name">{{ artistByName.name }}</h1>
            <button
              v-if="fullArtistData?.metadata?.mbid?.[0]"
              class="mobile-toggle"
              @click="toggleMobileInfo"
              :class="{ active: showMobileInfo }"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6,9 12,15 18,9"></polyline>
              </svg>
            </button>
          </div>
          <div v-if="fullArtistData?.metadata?.mbid?.[0]" class="artist-info-extended" :class="{ 'mobile-visible': showMobileInfo }">
            <!-- MusicBrainz Information -->
            <div v-if="mbLoading" class="mb-loading">Loading MusicBrainz data...</div>
            <div v-else-if="mbError" class="mb-error">{{ mbError }}</div>
            <div v-else-if="mbArtistData" class="mb-info">
              <table class="mb-table">
                <tr v-if="formattedLifeSpan">
                  <td class="mb-label">Active:</td>
                  <td class="mb-value">{{ formattedLifeSpan }}</td>
                </tr>
                <tr v-if="formattedLocation">
                  <td class="mb-label">Location:</td>
                  <td class="mb-value">{{ formattedLocation }}</td>
                </tr>
                <tr v-if="uniqueGenres.length">
                  <td class="mb-label">Genres:</td>
                  <td class="mb-value">{{ uniqueGenres.join(', ') }}</td>
                </tr>
              </table>
            </div>

            <!-- AudioControl REST API Information -->
            <div v-if="fullArtistData?.metadata" class="acr-info">
              <!-- Biography from AudioControl -->
              <div v-if="fullArtistData.metadata.biography" class="acr-biography">
                <div class="biography-header">
                  <h3 class="acr-section-title">Biography</h3>
                  <button
                    v-if="isBiographyLong"
                    class="biography-toggle"
                    @click="toggleBiography"
                    :class="{ active: showFullBiography }"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6,9 12,15 18,9"></polyline>
                    </svg>
                  </button>
                </div>
                <div class="biography-content">
                  <p ref="biographyRef">{{ displayedBiography }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Show AudioControl data when no MusicBrainz ID is available -->
          <div v-else-if="fullArtistData?.metadata && (fullArtistData.metadata.genres?.length || fullArtistData.metadata.biography)" class="artist-info-basic">
            <!-- Genres table for artists without MusicBrainz data -->
            <div v-if="uniqueGenres.length" class="mb-info">
              <table class="mb-table">
                <tbody>
                  <tr>
                    <td class="mb-label">Genres:</td>
                    <td class="mb-value">{{ uniqueGenres.join(', ') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- AudioControl REST API Information (without MusicBrainz data) -->
            <div class="acr-info">
              <!-- Biography from AudioControl -->
              <div v-if="fullArtistData.metadata.biography" class="acr-biography">
                <div class="biography-header">
                  <h3 class="acr-section-title">Biography</h3>
                  <button
                    v-if="isBiographyLong"
                    class="biography-toggle"
                    @click="toggleBiography"
                    :class="{ active: showFullBiography }"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6,9 12,15 18,9"></polyline>
                    </svg>
                  </button>
                </div>
                <div class="biography-content">
                  <p>{{ displayedBiography }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Fallback to just show artist ID -->
          <div v-else class="artist-id">
            <span class="id-label">Artist ID:</span>
            <span class="id-value">{{ artistByName.id }}</span>
          </div>
        </div>
      </div>

      <!-- Albums Section -->
      <div class="albums-section">
        <h2 class="section-header">Albums</h2>
        <AppPosterGrid
          :items="sortedAlbumsByReleaseDate"
          :loading="loading"
          :loaded="loaded"
          @click="(album) => router.push({
            name: 'album',
            params: { albumId: album.id },
            query: {
              from: 'artist',
              artistId: artistByName?.id || '',
              artistName: artistByName?.name || ''
            }
          })"
        />
      </div>
    </div>

    <!-- Artist Image Selector Modal -->
    <AppArtistImageSelector
      :is-visible="showImageSelector"
      :artist-name="artistByName?.name || ''"
      @close="showImageSelector = false"
      @select="onArtistImageSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, watch, ref } from 'vue'
import { storeToRefs } from 'pinia'

import { useRouter } from 'vue-router'
const router = useRouter()

import AppBackRouter from '@/components/app-back-router.vue'
import AppPosterGrid from '@/components/app-poster-grid.vue'
import AppIcon from '@/components/app-icon.vue'
import AppArtistImageSelector from '@/components/app-artist-image-selector.vue'

import { updateArtistImage } from '@/api/coverart'
import { rewriteAudiocontrolApiUrl } from '@/api/utils'

import { useRoute } from 'vue-router'
const route = useRoute()

const id = computed(() => route.params.artistId as string)

import { useAlbumStore } from '@/stores/album.ts'
const albumsStore = useAlbumStore()
const { loading, loaded, sortedAlbumsByReleaseDate } = storeToRefs(albumsStore)
const { getAlbumByArtistId } = albumsStore

import { useLibraryFetch } from '@/composables/useLibraryFetch.ts'
const libraryFetch = useLibraryFetch()

import { useArtistStore } from '@/stores/artist.ts'
const artistStore = useArtistStore()
const { getArtistByIdFromStore, getArtists } = artistStore

import { useToastStore } from '@/stores/toast'
const toastStore = useToastStore()
const { allArtists, artistByName: fullArtistData } = storeToRefs(artistStore)

import { useMusicBrainz } from '@/composables/useMusicBrainz'
const {
  artistData: mbArtistData,
  loading: mbLoading,
  error: mbError,
  fetchArtist: fetchMbArtist,
  formattedLifeSpan,
  formattedLocation
} = useMusicBrainz()

// Get basic artist from store
const artistByName = computed(() => getArtistByIdFromStore(id.value))

// Process artist image URL through rewrite function
const artistImageUrl = computed(() => {
  if (artistByName.value?.thumb_url?.[0]) {
    return rewriteAudiocontrolApiUrl(artistByName.value.thumb_url[0])
  }
  return null
})

// Mobile toggle for additional info
const showMobileInfo = ref(false)
const toggleMobileInfo = () => {
  showMobileInfo.value = !showMobileInfo.value
}

// Biography expand/collapse functionality
const showFullBiography = ref(false)
const isBiographyLong = ref(false)

// Artist image selector functionality
const showEditIcon = ref(false)
const showImageSelector = ref(false)

const checkBiographyLength = () => {
  const biography = fullArtistData.value?.metadata?.biography
  if (biography) {
    // Check if the biography is longer than approximately 4 lines worth of characters
    const maxLength = 400 // Rough estimate for 4 lines
    isBiographyLong.value = biography.length > maxLength
  }
}

const toggleBiography = () => {
  showFullBiography.value = !showFullBiography.value
}

// Artist image selector functionality
const openImageSelector = () => {
  showImageSelector.value = true
}

const onArtistImageSelected = async (imageUrl: string) => {
  console.log('Selected artist image:', imageUrl)

  const artistName = artistByName.value?.name
  if (!artistName) {
    console.error('No artist name available for image update')
    toastStore.showErrorToast('Unable to update artist image: Artist name not found')
    return
  }

  try {
    toastStore.showInfoToast('Updating artist image...')
    const result = await updateArtistImage(artistName, imageUrl)
    if (result.success) {
      console.log('Artist image updated successfully:', result.message)
      toastStore.showSuccessToast(`Artist image updated successfully for "${artistName}"`)
      // The cache should be invalidated automatically according to the API docs
    } else {
      console.error('Failed to update artist image:', result.message)
      toastStore.showErrorToast(`Failed to update artist image: ${result.message}`)
    }
  } catch (error) {
    console.error('Error updating artist image:', error)
    toastStore.showErrorToast('An error occurred while updating the artist image')
  }
}

// Computed property for displayed biography text
const displayedBiography = computed(() => {
  const biography = fullArtistData.value?.metadata?.biography
  if (!biography) return ''

  if (isBiographyLong.value && !showFullBiography.value) {
    // Truncate to approximately 4 lines worth of characters
    const maxLength = 400 // Rough estimate for 4 lines
    if (biography.length > maxLength) {
      return biography.substring(0, maxLength).trim() + '...'
    }
  }

  return biography
})

// Computed property for unique genres (removes duplicates)
const uniqueGenres = computed(() => {
  const genres = fullArtistData.value?.metadata?.genres
  if (!genres || !Array.isArray(genres)) return []

  // Filter out empty strings first
  const validGenres = genres.filter(genre => genre && genre.trim().length > 0)

  // Remove duplicates using case-insensitive comparison
  const seen = new Set<string>()
  const unique: string[] = []

  for (const genre of validGenres) {
    const lowerGenre = genre.toLowerCase().trim()
    if (!seen.has(lowerGenre)) {
      seen.add(lowerGenre)
      unique.push(genre.trim()) // Keep original casing
    }
  }

  return unique
})

// Function to get full artist metadata
const getArtistMetadata = async (artistId: string) => {
  const { error, data } = await libraryFetch(`/library/:activeLibrary/artist/by-id/${artistId}`).json()

  if (!error.value && data.value?.artist) {
    artistStore.artistByName = data.value.artist
  }
}

onMounted(async () => {
  // Ensure artists are loaded before trying to find by ID
  if (allArtists.value.length === 0) {
    await getArtists()
  }
  getAlbumByArtistId(id.value as string)
  // Get full artist metadata for MBID and other details
  await getArtistMetadata(id.value)

  // Fetch MusicBrainz data if MBID is available
  const mbid = fullArtistData.value?.metadata?.mbid?.[0]
  if (mbid) {
    await fetchMbArtist(mbid)
  }

  // Check biography length
  checkBiographyLength()
})

// Watch for MBID changes (in case it's loaded after component mounts)
watch(
  () => fullArtistData.value?.metadata?.mbid?.[0],
  (newMbid) => {
    if (newMbid && !mbArtistData.value) {
      fetchMbArtist(newMbid)
    }
  }
)

// Watch for biography changes to check length
watch(
  () => fullArtistData.value?.metadata?.biography,
  () => {
    checkBiographyLength()
  }
)
</script>

<style scoped lang="scss">
.artist-info {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 32px;
  padding: 24px;
  background: rgba(var(--color-surface-rgb), 0.5);
  border-radius: 12px;
}

.artist-image {
  flex-shrink: 0;
}

.artist-img {
  width: 280px;
  height: 280px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(var(--color-border-rgb), 0.2);
}

.artist-img-placeholder {
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: var(--color-surface-variant);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(var(--color-border-rgb), 0.2);

  span {
    font-size: 120px;
    font-weight: 600;
    color: var(--color-text-secondary);
  }
}

.artist-img-container {
  position: relative;
  cursor: pointer;
}

.artist-img-edit-overlay {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 40px;
  height: 40px;
  @include edit-overlay-background;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);

  &:hover {
    background: rgba(0, 0, 0, 0.3);
    transform: scale(1.1);
  }

  svg {
    width: 20px;
    height: 20px;
    color: white;
  }
}

.artist-details {
  flex: 1;
  min-width: 0;
}

.artist-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.artist-name {
  margin: 0 0 16px 0;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-head);
  line-height: 1.2;
  flex: 1;
}

.mobile-toggle {
  display: none;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: all 0.2s ease;

  svg {
    transition: transform 0.2s ease;
  }

  &.active svg {
    transform: rotate(180deg);
  }

  &:hover {
    background: rgba(var(--color-surface-rgb), 0.5);
    color: var(--color-text);
  }
}

.artist-id {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.artist-info-extended {
  margin-top: 8px;
}

.mb-loading,
.mb-error {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.mb-error {
  color: var(--color-error, #e74c3c);
}

.mb-info {
  margin-top: 4px;
}

.mb-table {
  border-collapse: collapse;
  font-size: 0.875rem;
  line-height: 1.4;

  td {
    padding: 3px 0;
    vertical-align: top;
  }
}

.mb-label {
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.8rem;
  white-space: nowrap;
  width: 120px;
}

.mb-value {
  color: var(--color-text);
}

// AudioControl REST API styles
.acr-info {
  margin-top: 20px;
  border-top: 1px solid var(--color-border);
  padding-top: 16px;
}

.artist-info-basic {
  margin-top: 16px;

  .acr-info {
    margin-top: 0;
    border-top: none;
    padding-top: 0;
  }
}

.acr-section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-head);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.acr-genres {
  margin-bottom: 20px;

  .genre-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .genre-tag {
    background: var(--color-accent);
    color: var(--color-accent-text);
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 500;
    text-transform: capitalize;
    white-space: nowrap;
  }
}

.acr-biography {
  .biography-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .biography-toggle {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
      transition: transform 0.2s ease;
    }

    &.active svg {
      transform: rotate(180deg);
    }

    &:hover {
      background: rgba(var(--color-surface-rgb), 0.5);
      color: var(--color-text);
    }
  }

  .biography-content {
    p {
      font-size: 0.95rem;
      line-height: 1.6;
      color: var(--color-body);
      margin: 0;
      text-align: justify;
    }
  }
}

.id-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.id-value {
  font-size: 0.875rem;
  color: var(--color-text);
  font-family: monospace;
  background: rgba(var(--color-surface-rgb), 0.8);
  padding: 4px 8px;
  border-radius: 4px;
  word-break: break-all;
}

.albums-section {
  margin-top: 24px;
}

.section-header {
  margin: 0 0 24px 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text);
  border-bottom: 2px solid var(--color-primary);
  padding-bottom: 8px;
}

@media (max-width: 768px) {
  .artist-info {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 16px;
    padding: 16px;
  }

  .artist-img,
  .artist-img-placeholder {
    width: 200px;
    height: 200px;
  }

  .artist-img-placeholder span {
    font-size: 80px;
  }

  .artist-name {
    font-size: 2rem;
    margin-bottom: 8px;
  }

  .mobile-toggle {
    display: block;
  }

  .artist-id {
    flex-direction: column;
    gap: 4px;
  }

  .artist-info-extended {
    display: none;

    &.mobile-visible {
      display: block;
      margin-top: 16px;
    }
  }

  .mb-table td {
    display: block;
    text-align: left;
    padding: 1px 0;
  }

  .mb-label {
    padding-right: 0;
    margin-bottom: 2px;
  }
}
</style>
