<template>
  <div class="album">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'albums' }" :loading="loading">{{ artistName }}</AppBackRouter>
    </div>

    <div class="grid">
      <div class="col-6-md">
        <AppAlbumDetailsCard :album="album" :loading="loading" />
      </div>
      <div class="col-6-md">
        <AppTracksCard :tracks="album?.tracks || []" :loading="loading" :album="album" />
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
const { album, loading } = storeToRefs(albumsStore)
const { getAlbumByAlbumId } = albumsStore

const id = computed(() => route.params.albumId as string)
const artistName = computed(() => {
  if (album.value && album.value.artists.length > 0) {
    return album.value.artists.join(', ')
  }
  return ''
})

onMounted(() => {
  getAlbumByAlbumId(id.value as string)
})
</script>

<style scoped lang="scss"></style>
