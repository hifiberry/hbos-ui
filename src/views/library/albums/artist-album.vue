<template>
  <div class="album">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'albums' }">Albums</AppBackRouter>
    </div>

    <div class="card">
      <AppAlbums :albums="albums" :loading="loadingAlbum" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'

import AppBackRouter from '@/components/app-back-router.vue'
import AppAlbums from '@/components/app-albums.vue'

import { useRoute } from 'vue-router'
const route = useRoute()

const id = computed(() => route.params.artistId as string)

import { useAlbumStore } from '@/stores/album.ts'
const albumsStore = useAlbumStore()
const { albums, loading: loadingAlbum } = storeToRefs(albumsStore)
const { getAlbumByArtistId } = albumsStore

onMounted(() => {
  getAlbumByArtistId(id.value as string)
})
</script>

<style scoped lang="scss"></style>
