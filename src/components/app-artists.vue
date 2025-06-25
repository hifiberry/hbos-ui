<template>
  <div :class="['app-artists', inRow ? 'row' : 'cell']">
    <AppPosterSkeleton v-if="loading" poster-form="circle" />

    <template v-else-if="artists.length > 0">
      <AppPoster
        v-for="artist in artists"
        :key="artist.id"
        :title="artist.name"
        :subtitle="`${artist.album_count} album${artist.album_count !== 1 ? 's' : ''}`"
        :src="artist.thumb_url[0]"
        poster-form="circle"
        @click="router.push({ name: 'artist-album', params: { artistId: artist.id } })"
      />
    </template>

    <div v-else class="">No Artists</div>
  </div>
</template>

<script setup lang="ts">
import type { Artist } from '@/types/library'

interface ArtistsProps {
  loading?: boolean
  artists?: Artist[]
  inRow?: boolean
}

const { loading = false, artists = [], inRow = false } = defineProps<ArtistsProps>()

import { useRouter } from 'vue-router'
const router = useRouter()

import AppPoster from '@/components/app-poster.vue'
import AppPosterSkeleton from '@/components/skeletons/app-poster-skeleton.vue'
</script>

<style scoped lang="scss">
.app-artists {
  display: grid;
  gap: 60px;
  @include media-down(xl) {
    gap: 30px;
  }

  &.row {
    grid-auto-flow: column;
    grid-auto-columns: 140px;
    overflow: hidden;
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
  &.cell {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 60px 80px;
    @include media-down(md) {
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    }
  }
}
</style>
