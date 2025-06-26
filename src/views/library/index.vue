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

      <AppArtists :artists="artists" :loaded="loadedArtists" :loading="loadingArtists" in-row />
    </div>

    <div class="card">
      <div class="title">
        <h2>Albums</h2>
        <router-link v-if="albums.length > 0" :to="{ name: 'albums' }" class="text-link"
          >View All</router-link
        >
      </div>

      <AppAlbums :albums="albums" :loaded="loadedAlbums" :loading="loadingAlbums" in-row />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'

import AppArtists from '@/components/app-artists.vue'
import AppAlbums from '@/components/app-albums.vue'

import { useLibraryStore } from '@/stores/library'
const libraryStore = useLibraryStore()

import { useArtistStore } from '@/stores/artist'
const artistStore = useArtistStore()
const { artists, loading: loadingArtists, loaded: loadedArtists } = storeToRefs(artistStore)
const { getArtists } = artistStore

import { useAlbumStore } from '@/stores/album'
const albumStore = useAlbumStore()
const { albums, loading: loadingAlbums, loaded: loadedAlbums } = storeToRefs(albumStore)
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
