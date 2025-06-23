<template>
  <div class="album">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'albums' }">Album Name</AppBackRouter>
    </div>
    <div class="grid">
      <div class="col-6-md">
        <AppAlbumDetailsCard :album="album" :loading="loadingAlbum" />
      </div>
      <div class="col-6-md">
        <AppSongsCard :songs="songs" :loading="loadingSong" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'

import AppBackRouter from '@/components/app-back-router.vue'
import AppAlbumDetailsCard from '@/components/app-album-details-card.vue'
import AppSongsCard from '@/components/app-songs-card.vue'

import { useRoute } from 'vue-router'
const route = useRoute()

const id = computed(() => route.params.id as string)

import { useAlbumsStore } from '@/stores/albums'
const albumsStore = useAlbumsStore()
const { album, loading: loadingAlbum } = storeToRefs(albumsStore)
const { getAlbumById } = albumsStore

import { useSongsStore } from '@/stores/songs'
const songsStore = useSongsStore()
const { songs, loading: loadingSong } = storeToRefs(songsStore)
const { getSongs } = songsStore

onMounted(() => {
  getAlbumById(id.value as string)
  getSongs()
})
</script>

<style scoped lang="scss"></style>
