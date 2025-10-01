<template>
  <div class="album">
    <div class="breadcrumbs">
      <AppBackRouter :to="backRoute" :loading="loading">{{ backText }}</AppBackRouter>
    </div>

    <div class="grid">
      <div class="col-6-md">
        <AlbumDetailsCard :album="album" :loading="loading" />
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

import AppBackRouter from '@/components/AppBackRouter.vue'
import AlbumDetailsCard from '@/components/AlbumDetailsCard.vue'
import AppTracksCard from '@/components/AppTracksCard.vue'

import { useRoute } from 'vue-router'
const route = useRoute()

import { useAlbumStore } from '@/stores/album.ts'
const albumsStore = useAlbumStore()
const { album, loading } = storeToRefs(albumsStore)
const { getAlbumByAlbumId } = albumsStore

const id = computed(() => route.params.albumId as string)

// Determine back route and text based on source
const backRoute = computed(() => {
  const from = route.query.from as string
  if (from === 'artist' && route.query.artistId) {
    return { name: 'artist-album', params: { artistId: route.query.artistId } }
  }
  return { name: 'albums' }
})

const backText = computed(() => {
  const from = route.query.from as string
  if (from === 'artist' && route.query.artistName) {
    return route.query.artistName as string
  }
  return 'Albums'
})

onMounted(() => {
  getAlbumByAlbumId(id.value as string)
})
</script>

<style scoped lang="scss"></style>
