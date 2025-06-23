<template>
  <div class="app-album-details">
    <template v-if="loading">
      <div class="album-cover"></div>
    </template>
    <template v-if="album">
      <div class="album-cover">
        <AppCover :src="album.cover_art" />
      </div>
      <div class="album-details">
        <div class="h2">{{ album.name }}</div>
        <div class="album-details__count">
          {{ album.tracks_count }} track{{ album.tracks_count !== 1 ? 's' : '' }}
        </div>

        <AppListenNow class="album-details__listen" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import AppCover from '@/components/app-cover.vue'
import AppListenNow from '@/components/app-listen-now.vue'

import type { Album } from '@/types/library'
interface AppAlbumDetailsProps {
  loading?: boolean
  album?: Album | null
}

const { loading = false, album = null } = defineProps<AppAlbumDetailsProps>()
</script>

<style scoped lang="scss">
.app-album-details {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 24px;
  color: var(--color-body-secondary);
  .album {
    &-cover {
      &:deep(.app-cover) {
        width: 100%;
        height: 100%;
        /* todo remove img styles */
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
    }
    &-details {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      &__count {
        margin: 24px 0;
      }
      &__listen {
        margin-top: auto;
      }
    }
  }
}
</style>
