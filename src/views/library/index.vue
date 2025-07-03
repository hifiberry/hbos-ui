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
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'

import { useRouter } from 'vue-router'
const router = useRouter()

import { useLibraryStore } from '@/stores/library'
const libraryStore = useLibraryStore()

import { useArtistStore } from '@/stores/artist'
const artistStore = useArtistStore()
const { artists, loading: loadingArtists, loaded: loadedArtists } = storeToRefs(artistStore)
const { getArtists } = artistStore

import { useAlbumStore } from '@/stores/album'
import AppPosterGrid from '@/components/app-poster-grid.vue'
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
}
</style>
