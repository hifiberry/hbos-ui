<template>
  <div class="artists">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'library' }">Artists</AppBackRouter>
    </div>
    <div class="card">
      <AppArtists :loading="loading" :artists="artists" />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppBackRouter from '@/components/app-back-router.vue'
import AppArtists from '@/components/app-artists.vue'

import { storeToRefs } from 'pinia'

import { onMounted } from 'vue'

import { useArtistStore } from '@/stores/artist.ts'
const artistStore = useArtistStore()
const { loading, artists } = storeToRefs(artistStore)
const { getArtists } = artistStore

onMounted(() => {
  getArtists()
})
</script>

<style scoped lang="scss">
.artists {
}
</style>
