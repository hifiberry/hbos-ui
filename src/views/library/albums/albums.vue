<template>
  <div class="albums">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'library' }">Albums</AppBackRouter>
    </div>
    <div class="card">
      <AppPosterGrid
        :loading="loading"
        :loaded="loaded"
        :items="sortedAlbumsByReleaseDate"
        @click="(album) => router.push({ name: 'album', params: { albumId: album.id } })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

import { useRouter } from 'vue-router'
const router = useRouter()

import { storeToRefs } from 'pinia'

import AppBackRouter from '@/components/app-back-router.vue'

import { useAlbumStore } from '@/stores/album.ts'
import AppPosterGrid from '@/components/app-poster-grid.vue'
const albumStore = useAlbumStore()
const { loading, loaded, sortedAlbumsByReleaseDate } = storeToRefs(albumStore)
const { getAlbums } = albumStore

onMounted(() => {
  getAlbums()
})
</script>
