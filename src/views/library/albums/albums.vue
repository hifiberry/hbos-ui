<template>
  <div class="albums">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'library' }">Albums</AppBackRouter>
    </div>
    <div class="card">
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
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

import { useAlbumsStore } from '@/stores/albums'
const albumStore = useAlbumsStore()

import { useRouter } from 'vue-router'
const router = useRouter()

import AppPoster from '@/components/app-poster.vue'
import AppPosterSkeleton from '@/components/skeletons/app-poster-skeleton.vue'
import AppBackRouter from '@/components/app-back-router.vue'

onMounted(() => {
  albumStore.getAlbums()
})
</script>

<style scoped lang="scss">
.albums {
  &-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, 140px);
    gap: 60px 80px;
    @include media-down(xl) {
      gap: 30px;
    }
    @include media-down(md) {
      grid-template-columns: repeat(auto-fill, 100px);
    }
  }
}
</style>
