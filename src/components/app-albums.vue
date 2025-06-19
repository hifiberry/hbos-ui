<template>
  <div class="albums card">
    <div class="title">
      <h2>Albums</h2>

      <router-link :to="{ name: 'albums' }">View All</router-link>
    </div>

    <div class="albums-list">
      <AppPosterSkeleton v-if="albumStore.loading" />

      <template v-else>
        <AppPoster
          v-for="album in albumStore.albums"
          :key="album.id"
          :title="album.name"
          :subtitle="`${album.release_date ? album.release_date.substring(0, 4) : 'Unknown year'} • ${album.tracks_count} track${album.tracks_count !== 1 ? 's' : ''}`"
          :src="album.cover_art"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

import { useAlbumsStore } from '@/stores/albums'
const albumStore = useAlbumsStore()

import AppPoster from '@/components/app-poster.vue'
import AppPosterSkeleton from '@/components/skeletons/app-poster-skeleton.vue'

onMounted(() => {
  albumStore.getAlbums()
})
</script>

<style scoped lang="scss">
.albums {
  &-list {
    display: flex;
    gap: 60px;
    overflow: hidden;
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
