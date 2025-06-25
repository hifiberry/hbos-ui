<template>
  <div class="app-album-details-card card">
    <template v-if="loading">
      <div class="album-cover">
        <AppSkeleton />
      </div>
      <div class="album-details">
        <AppSkeleton class="h2" />
        <AppSkeleton class="album-details__count" />
        <AppSkeleton class="album-details__listen" />
      </div>
    </template>
    <template v-if="album && !loading">
      <div class="album-cover">
        <AppCover :src="albumCover" />
      </div>
      <div class="album-details">
        <div class="h2">{{ album.name }}</div>
        <div class="album-details__count">
          {{ album.tracks_count }} track{{ album.tracks_count !== 1 ? 's' : '' }}
        </div>
        <div class="album-details__listen">
          <AppListenNow />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import AppCover from '@/components/app-cover.vue'
import AppListenNow from '@/components/app-listen-now.vue'
import AppSkeleton from '@/components/skeletons/app-skeleton.vue'

import type { Album } from '@/types/library'
interface AppAlbumDetailsProps {
  loading?: boolean
  album?: Album | null
}

const { loading = false, album = null } = defineProps<AppAlbumDetailsProps>()

import { useLibraryStore } from '@/stores/library.ts'
const libraryStore = useLibraryStore()

const albumCover = computed(() => libraryStore.getAlbumCover(album?.id || ''))
</script>

<style scoped lang="scss">
.app-album-details-card {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 24px;
  color: var(--color-body-secondary);
  @include media-down(xl) {
    grid-template-columns: 100px 1fr;
    gap: 12px;
  }
  @include media-down(md) {
    grid-template-columns: none;
    grid-template-rows: auto auto;
    justify-content: center;
  }
  .album {
    &-cover {
      display: flex;
      align-items: center;
      justify-content: center;
      &:deep(.app-cover),
      &:deep(.skeleton) {
        width: 200px;
        height: 200px;
        @include media-down(xl) {
          width: 100px;
          height: 100px;
        }
      }
    }
    &-details {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      text-align: left;
      @include media-down(md) {
        text-align: center;
      }
      .h2 {
        &.skeleton {
          width: 40%;
          @include media-down(md) {
            width: 100%;
          }
        }
      }
      &__count {
        margin: 24px 0;
        @include media-down(xl) {
          margin: 5px 0;
        }
        &.skeleton {
          width: 40%;
          @include media-down(md) {
            width: 100%;
          }
        }
      }
      &__listen {
        margin-top: auto;
        @include media-down(md) {
          display: none;
        }
        &.skeleton {
          height: 40px;
          width: 20%;
          @include media-down(md) {
            width: 100%;
          }
        }
      }
    }
  }
}
</style>
