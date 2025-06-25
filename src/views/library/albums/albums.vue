<template>
  <div class="albums">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'library' }">Albums</AppBackRouter>
    </div>
    <div class="card">
      <AppAlbums :loading="loading" :albums="albums" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

import { storeToRefs } from 'pinia'

import AppBackRouter from '@/components/app-back-router.vue'
import AppAlbums from '@/components/app-albums.vue'

import { useAlbumStore } from '@/stores/album.ts'
const albumStore = useAlbumStore()
const { loading, albums } = storeToRefs(albumStore)
const { getAlbums } = albumStore

onMounted(() => {
  getAlbums()
})
</script>

<style scoped lang="scss">
.albums {
}
</style>
