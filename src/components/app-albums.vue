<template>
  <div class="albums card">
    <div class="title">
      <h2>Albums</h2>

      <router-link :to="{ name: 'albums' }" class="text-link">View All</router-link>
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
          @click="router.push({ name: 'album', params: { id: album.id } })"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
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
