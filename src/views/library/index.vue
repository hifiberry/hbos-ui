<template>
  <div class="library">
    <h1>Music Library</h1>

    <div class="card">
      <div class="title">
        <h2>Artists</h2>
        <router-link v-if="artists.length > 0" :to="{ name: 'artists' }" class="text-link"
          >View All</router-link
        >
      </div>

      <AppPosterGrid
        :loading="loadingArtists"
        :loaded="loadedArtists"
        :items="artists"
        poster-form="circle"
        in-row
        @click="(artist) => router.push({ name: 'artist-album', params: { artistId: artist.id } })"
      />
    </div>

    <div class="card">
      <div class="title">
        <h2>Albums</h2>
        <router-link
          v-if="sortedAlbumsByReleaseDate.length > 0"
          :to="{ name: 'albums' }"
          class="text-link"
          >View All</router-link
        >
      </div>

      <AppPosterGrid
        :loading="loadingAlbums"
        :loaded="loadedAlbums"
        :items="sortedAlbumsByReleaseDate"
        in-row
        @click="(album) => router.push({ name: 'album', params: { albumId: album.id } })"
      />
    </div>

    <div class="card radio-section">
      <div class="title">
        <h2>Radio</h2>
        <router-link :to="{ name: 'radio' }" class="text-link">View All</router-link>
      </div>

      <div v-if="favoritesList.length === 0 && loaded" class="empty-state">
        <AppIcon icon="radio" class="empty-icon" />
        <p>No favorite radio stations saved</p>
      </div>

      <AppPosterGrid
        v-else
        :loading="loading"
        :loaded="loaded"
        :items="favoriteStationsForDisplay"
        in-row
        @click="playStation"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useRouter } from 'vue-router'
const router = useRouter()

import { useLibraryStore } from '@/stores/library'
const libraryStore = useLibraryStore()

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
           (station.metadata?.tags || station.tags).split(',').map(tag => tag.trim()).slice(0, 3).join(', ') : '',
    $cover_src: station.metadata?.coverart_url || station.img || ''
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
import AppPosterGrid from '@/components/app-poster-grid.vue'
import AppIcon from '@/components/app-icon.vue'
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
})
</script>

<style scoped lang="scss">
.library {
  .card {
    &:not(:last-of-type) {
      margin-bottom: 55px;
      @include media-down(lg) {
        margin-bottom: 24px;
      }
    }
  }
  .title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 25px;
    h2 {
      margin-bottom: 0;
    }
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

  // Radio section specific styling
  .radio-section {
    :deep(.app-poster-grid .poster-grid.row) {
      @include media-down(md) {
        justify-items: start;
      }
    }
  }
}
</style>
