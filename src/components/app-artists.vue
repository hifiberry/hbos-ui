<template>
  <div class="artists card">
    <div class="title">
      <h2>Artists</h2>

      <router-link :to="{ name: 'artists' }">View All</router-link>
    </div>

    <div class="artists-list">
      <AppPosterSkeleton v-if="artistStore.loading" poster-form="circle" />

      <template v-else>
        <AppPoster
          v-for="artist in artistStore.artists"
          :key="artist.id"
          :title="artist.name"
          :subtitle="`${artist.album_count} album${artist.album_count !== 1 ? 's' : ''}`"
          :src="artist.thumb_url[0]"
          poster-form="circle"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

import { useArtistsStore } from '@/stores/artists'
const artistStore = useArtistsStore()

import AppPoster from '@/components/app-poster.vue'
import AppPosterSkeleton from '@/components/skeletons/app-poster-skeleton.vue'

onMounted(() => {
  artistStore.getArtists()
})
</script>

<style scoped lang="scss">
.artists {
  &-list {
    display: flex;
    gap: 60px;
    overflow: hidden;
    @include media-down(xl) {
      gap: 30px;
    }
    @include media-down(lg) {
      flex-wrap: wrap;
      gap: 15px;
      align-items: center;
      justify-content: space-around;
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
