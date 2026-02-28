<template>
  <PageContent title="Music Library">
    <ContentBox>
      <div class="libaryCard">
        <div class="title">
          <h2>Artists</h2>
          <router-link v-if="artists.length > 0" :to="{ name: 'artists' }" class="text-link">View All</router-link>
        </div>
        <PosterGrid :loading="loadingArtists" :loaded="loadedArtists" :items="artists" poster-form="circle" in-row
          @click="(artist) => router.push({ name: 'artist-album', params: { artistId: artist.id } })" />
      </div>
    </ContentBox>

    <ContentBox class="libaryContentBox">
      <div class="libaryCard">
        <div class="title">
          <h2>Albums</h2>
          <router-link v-if="sortedAlbumsByReleaseDate.length > 0" :to="{ name: 'albums' }" class="text-link">View
            All</router-link>
        </div>
        <PosterGrid :loading="loadingAlbums" :loaded="loadedAlbums" :items="sortedAlbumsByReleaseDate" in-row
          @click="(album) => router.push({ name: 'album', params: { albumId: album.id } })" />
      </div>
    </ContentBox>

    <ContentBox class="libaryContentBox">
      <div class="libaryCard">
        <div class="title">
          <h2>Genres</h2>
          <router-link :to="{ name: 'genres' }" class="text-link">View All</router-link>
        </div>
        <div v-if="categories.length === 0" class="empty-state">
          <p>No genres found</p>
        </div>
        <div v-else class="category-chips">
          <button
            v-for="category in categories.slice(0, 10)"
            :key="category"
            class="category-chip"
            @click="router.push({ name: 'albums-by-genre', params: { category } })"
          >
            {{ category }}
          </button>
        </div>
      </div>
    </ContentBox>

    <ContentBox class="libaryContentBox">
      <div class="libaryCard">
        <div class="title">
          <h2>Radio</h2>
          <router-link :to="{ name: 'radio' }" class="text-link">View All</router-link>
        </div>

        <div v-if="favoritesList.length === 0" class="empty-state">
          <Icon icon="radio" class="empty-icon" />
          <p>No favorite radio stations saved</p>
        </div>

        <PosterGrid v-else :loading="loading" :loaded="loaded" :items="favoriteStationsForDisplay" in-row
          @click="playStation" />
      </div>
    </ContentBox>
  </PageContent>
</template>

<script setup lang="ts">
import ContentBox from "@/components/ContentBox.vue"
import PageContent from "@/components/PageContent.vue"
import { onMounted, computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import { useRouter } from 'vue-router'
const router = useRouter()

import { useLibraryStore } from '@/stores/library'
const libraryStore = useLibraryStore()

import { useLibraryFetch } from '@/composables/useLibraryFetch.ts'
const libraryFetch = useLibraryFetch()
const categories = ref<string[]>([])

import { useArtistStore } from '@/stores/artist'
const artistStore = useArtistStore()
const { artists, loading: loadingArtists, loaded: loadedArtists } = storeToRefs(artistStore)
const { getArtists } = artistStore

import { useRadioStore, type RadioFavorite } from '@/stores/radio'
const radioStore = useRadioStore()
const {
  favoritesList,
  loading,
  loaded
} = storeToRefs(radioStore)

// Convert radio favorites to poster grid format
const favoriteStationsForDisplay = computed(() => {
  return favoritesList.value.map((station: RadioFavorite) => ({
    $id: station.id,
    $title: station.title,
    $subtitle: station.metadata?.country || station.country || 'Radio Station',
    $note: (station.metadata?.tags || station.tags) ?
           String(station.metadata?.tags || station.tags).split(',').map(tag => tag.trim()).slice(0, 3).join(', ') : '',
    $cover_src: (typeof station.metadata?.logo_url === 'string' ? station.metadata.logo_url : '') ||
                (typeof station.metadata?.coverart_url === 'string' ? station.metadata.coverart_url : '') ||
                station.img || ''
  }))
})

const playStation = async (station: { $id?: string }) => {
  // Find the original favorite station data
  const originalStation = favoritesList.value.find(fav => fav.id === station.$id)
  if (originalStation) {
    await radioStore.playStation(originalStation)
  }
}

import { useAlbumStore } from '@/stores/album'
import PosterGrid from '@/components/PosterGrid.vue'
import Icon from '@/components/Icon.vue'
const albumStore = useAlbumStore()
const {
  sortedAlbumsByReleaseDate,
  loading: loadingAlbums,
  loaded: loadedAlbums,
} = storeToRefs(albumStore)
const { getAlbums } = albumStore

onMounted(async () => {
  await libraryStore.getAvailableLibrary()
  getArtists()
  getAlbums()
  await radioStore.initialize()

  const { data } = await libraryFetch<{ categories: string[] }>(
    '/library/:activeLibrary/categories',
  ).json()
  if (data.value?.categories) {
    categories.value = data.value.categories
  }
})
</script>

<style scoped lang="scss">
.title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 25px;

  h2 {
    margin-bottom: 0;
  }
}
.libaryCard{
  padding: 25px;
}


.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--color-text-secondary);

  .empty-icon {
    margin-bottom: 16px;
    opacity: 0.6;
  }

  p {
    margin: 0;
    font-size: 16px;
  }
}

.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 20px;
  background-color: var(--color-background-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-head);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;

  &:hover {
    background-color: var(--color-accent);
    border-color: var(--color-accent);
    color: white;
  }
}
</style>
