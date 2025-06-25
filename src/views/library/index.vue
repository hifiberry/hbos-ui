<template>
  <div class="library">
    <h1>Music Library</h1>

    <div class="card">
      <div class="title">
        <h2>Artists</h2>
        <router-link :to="{ name: 'artists' }" class="text-link">View All</router-link>
      </div>

      <AppArtists :artists="artistStore.artists" in-row />
    </div>

    <div class="card">
      <div class="title">
        <h2>Albums</h2>
        <router-link :to="{ name: 'albums' }" class="text-link">View All</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

import AppArtists from '@/components/app-artists.vue'
import AppAlbums from '@/components/app-albums.vue'

import { useArtistStore } from '@/stores/artist'
const artistStore = useArtistStore()

onMounted(() => {
  artistStore.getArtists()
})
</script>

<style scoped lang="scss">
.library {
  .card {
    &:not(:last-of-type) {
      margin-bottom: 55px;
      @include media-down(lg) {
        margin-bottom: 24px;
      }
    }
  }
  .title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 25px;
    h2 {
      margin-bottom: 0;
    }
  }
}
</style>
