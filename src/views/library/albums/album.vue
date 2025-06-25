<template>
  <div class="album">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'library' }">Albums</AppBackRouter>
    </div>

    <div class="grid">
      <div class="col-6-md">
        <AppAlbumDetailsCard :album="album" :loading="loadingAlbum" />
      </div>
      <div class="col-6-md">
        <AppTracksCard :tracks="album?.tracks || []" :loading="loadingAlbum" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'

import AppBackRouter from '@/components/app-back-router.vue'
import AppAlbumDetailsCard from '@/components/app-album-details-card.vue'
import AppTracksCard from '@/components/app-tracks-card.vue'

import { useRoute } from 'vue-router'
const route = useRoute()

import { useAlbumStore } from '@/stores/album.ts'
const albumsStore = useAlbumStore()
const { album, loading: loadingAlbum } = storeToRefs(albumsStore)
const { getAlbumByAlbumId } = albumsStore

const id = computed(() => route.params.albumId as string)

onMounted(() => {
  getAlbumByAlbumId(id.value as string)
})
</script>

<style scoped lang="scss"></style>
