<template>
  <div class="artists card">
    <div class="title">
      <h2>Artists</h2>

      <router-link :to="{ name: 'artists' }" class="text-link">View All</router-link>
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
          @click="router.push({ name: 'album', params: { id: artist.id } })"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

import { useRouter } from 'vue-router'
const router = useRouter()

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
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 140px;
    gap: 60px;
    overflow: hidden;
    @include media-down(xl) {
      gap: 30px;
    }
    @include media-down(lg) {
      grid-auto-columns: 100px;
    }
    @include media-down(md) {
      gap: 15px;
      grid-auto-flow: initial;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      grid-auto-columns: unset;
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
