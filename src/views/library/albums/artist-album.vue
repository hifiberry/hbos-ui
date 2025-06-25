<template>
  <div class="album">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'library' }">Back to Library</AppBackRouter>
    </div>

    <div class="card">
      <AppAlbums :albums="albums" :loading="loadingAlbum" />
    </div>

    <div class="grid">
      <div class="col-6-md">
        <!--        <AppAlbumDetailsCard :album="album" :loading="loadingAlbum" />-->
      </div>
      <div class="col-6-md">
        <!--        <AppSongsCard :songs="songs" :loading="loadingSong" />-->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'

import AppBackRouter from '@/components/app-back-router.vue'
import AppAlbums from '@/components/app-albums.vue'
import AppAlbumDetailsCard from '@/components/app-album-details-card.vue'
import AppSongsCard from '@/components/app-tracks-card.vue'

import { useRoute } from 'vue-router'
const route = useRoute()

const id = computed(() => route.params.artistId as string)

import { useAlbumStore } from '@/stores/album.ts'
const albumsStore = useAlbumStore()
const { albums, loading: loadingAlbum } = storeToRefs(albumsStore)
const { getAlbumByArtistId } = albumsStore
//
// import { useSongsStore } from '@/stores/songs'
// const songsStore = useSongsStore()
// const { songs, loading: loadingSong } = storeToRefs(songsStore)
// const { getSongs } = songsStore

onMounted(() => {
  getAlbumByArtistId(id.value as string)
  // getSongs()
})
</script>

<style scoped lang="scss"></style>
