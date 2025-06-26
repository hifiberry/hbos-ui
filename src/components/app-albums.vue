<template>
  <div class="app-albums">
    <div :class="['album-grid', inRow ? 'row' : 'cell']">
      <AppPosterSkeleton v-if="loading" />

      <template v-else>
        <AppPoster
          v-for="album in albums"
          :key="album.id"
          :title="album.name"
          :subtitle="`${album.release_date ? album.release_date.substring(0, 4) : 'Unknown year'} • ${album.tracks_count} track${album.tracks_count !== 1 ? 's' : ''}`"
          :src="album.cover_art"
          @click="router.push({ name: 'album', params: { albumId: album.id } })"
        />
      </template>
    </div>

    <div v-if="loaded && albums.length === 0" class="no-albums">No available albums found</div>
  </div>
</template>

<script setup lang="ts">
import type { Album } from '@/types/library'

interface AlbumsProps {
  loading?: boolean
  loaded?: boolean
  albums?: Album[]
  inRow?: boolean
}

const { loading = false, loaded = false, albums = [], inRow = false } = defineProps<AlbumsProps>()

import { useRouter } from 'vue-router'
const router = useRouter()

import AppPoster from '@/components/app-poster.vue'
import AppPosterSkeleton from '@/components/skeletons/app-poster-skeleton.vue'
</script>

<style scoped lang="scss">
.app-albums {
  .album {
    &-grid {
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
  }
  .no-albums {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 140px;
    @include media-down(lg) {
      min-height: 100px;
    }
  }
}
</style>
