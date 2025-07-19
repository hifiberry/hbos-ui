<template>
  <div class="album">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'artists' }">{{ artistByName?.name || 'Artists' }}</AppBackRouter>
    </div>

    <div class="card">
      <AppPosterGrid
        :items="sortedAlbumsByReleaseDate"
        :loading="loading"
        :loaded="loaded"
        @click="(album) => router.push({ name: 'album', params: { albumId: album.id } })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
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

import { useArtistStore } from '@/stores/artist.ts'
const artistStore = useArtistStore()
const { getArtistByIdFromStore, getArtists } = artistStore
const { allArtists } = storeToRefs(artistStore)

// Get artist from store instead of making API call
const artistByName = computed(() => getArtistByIdFromStore(id.value))

onMounted(async () => {
  // Ensure artists are loaded before trying to find by ID
  if (allArtists.value.length === 0) {
    await getArtists()
  }
  getAlbumByArtistId(id.value as string)
})
</script>

<style scoped lang="scss">
</style>
