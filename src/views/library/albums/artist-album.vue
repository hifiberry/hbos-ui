<template>
  <div class="album">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'artists' }">Artists</AppBackRouter>
    </div>

    <div class="card">
      <!-- Artist Info Section -->
      <div v-if="artistByName" class="artist-info">
        <div class="artist-image">
          <img
            v-if="artistByName.thumb_url?.[0]"
            :src="artistByName.thumb_url[0]"
            :alt="artistByName.name"
            class="artist-img"
          />
          <div v-else class="artist-img-placeholder">
            <span>{{ artistByName.name.charAt(0).toUpperCase() }}</span>
          </div>
        </div>
        <div class="artist-details">
          <h1 class="artist-name">{{ artistByName.name }}</h1>
          <div v-if="fullArtistData?.metadata?.mbid?.[0]" class="artist-info-extended">
            <!-- MusicBrainz Information -->
            <div v-if="mbLoading" class="mb-loading">Loading MusicBrainz data...</div>
            <div v-else-if="mbError" class="mb-error">{{ mbError }}</div>
            <div v-else-if="mbArtistData" class="mb-info">
              <div v-if="formattedLifeSpan" class="mb-info-item">
                <span class="mb-label">Active:</span>
                <span class="mb-value">{{ formattedLifeSpan }}</span>
              </div>
              <div v-if="formattedLocation" class="mb-info-item">
                <span class="mb-label">Location:</span>
                <span class="mb-value">{{ formattedLocation }}</span>
              </div>
              <div v-if="primaryGenre" class="mb-info-item">
                <span class="mb-label">Genre:</span>
                <span class="mb-value">{{ primaryGenre }}</span>
              </div>
            </div>
          </div>
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useRouter } from 'vue-router'
const router = useRouter()

import AppBackRouter from '@/components/app-back-router.vue'
import AppPosterGrid from '@/components/app-poster-grid.vue'

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
const { allArtists, artistByName: fullArtistData } = storeToRefs(artistStore)

import { useMusicBrainz } from '@/composables/useMusicBrainz'
const {
  artistData: mbArtistData,
  loading: mbLoading,
  error: mbError,
  fetchArtist: fetchMbArtist,
  formattedLifeSpan,
  primaryGenre,
  formattedLocation
} = useMusicBrainz()

// Get basic artist from store
const artistByName = computed(() => getArtistByIdFromStore(id.value))

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

.artist-details {
  flex: 1;
  min-width: 0;
}

.artist-name {
  margin: 0 0 16px 0;
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-head);
  line-height: 1.2;
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
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mb-info-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.875rem;
  line-height: 1.4;
}

.mb-label {
  font-weight: 600;
  color: var(--color-text-secondary);
  min-width: 70px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.8rem;
}

.mb-value {
  color: var(--color-text);
  flex: 1;
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
  }

  .artist-id {
    flex-direction: column;
    gap: 4px;
  }

  .mb-info-item {
    flex-direction: column;
    gap: 2px;
    text-align: left;
  }

  .mb-label {
    min-width: auto;
  }
}
</style>
