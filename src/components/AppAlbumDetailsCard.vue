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
        <div v-if="album.artists && album.artists.length > 0" class="album-details__artist">
          {{ album.artists.join(', ') }}
        </div>
        <div v-if="album.release_date" class="album-details__year">
          {{ new Date(album.release_date).getFullYear() }}
        </div>
        <div class="album-details__count">
          {{ album.tracks_count }} track{{ album.tracks_count !== 1 ? 's' : '' }}
        </div>
        <div class="album-details__listen">
          <AppListenNow @click="onListenNow" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import AppCover from '@/components/app-cover.vue'
import AppListenNow from '@/components/AppListenNow.vue'
import AppSkeleton from '@/components/skeletons/AppSkeleton.vue'

import type { AlbumDetails, Track } from '@/types/library'
interface AppAlbumDetailsProps {
  loading?: boolean
  album?: AlbumDetails | null
}

const { loading = false, album = null } = defineProps<AppAlbumDetailsProps>()

import { useAlbumStore } from '@/stores/album.ts'
const libraryStore = useAlbumStore()

const albumCover = computed(() => libraryStore.getAlbumCoverById(album?.id || ''))

import { usePlayerStore } from '@/stores/player.ts'
import { useToastStore } from '@/stores/toast'

const playerStore = usePlayerStore()
const { sendLibraryCommand } = playerStore
const toastStore = useToastStore()

const onListenNow = async () => {
  try {
    if (album?.tracks?.length) {
      // Pause the active player
      await playerStore.sendCommand('pause')
      await playerStore.sendCommand('clear_queue')

      for (let i = 0; i < album.tracks.length; i++) {
        const track = album.tracks[i] as Track

        await playerStore.addTrackToQueue(track)
      }

      // Play from library player (not active player)
      await sendLibraryCommand('play')
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err)

    toastStore.showErrorToast(`Listen now Error: ${errorMessage}`)
  }
}
</script>

<style scoped lang="scss">
.app-album-details-card {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
  color: var(--color-body-secondary);
  @include media-down(xl) {
    grid-template-columns: 200px 1fr;
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
      align-items: flex-start;
      justify-content: center;
      &:deep(.app-cover),
      &:deep(.skeleton) {
        width: 400px;
        height: 400px;
        @include media-down(xl) {
          width: 200px;
          height: 200px;
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
      &__artist {
        margin: 4px 0 0 0;
        font-size: 1.1rem;
        font-weight: 500;
        color: var(--color-text-secondary);
        @include media-down(xl) {
          font-size: 1rem;
          margin: 2px 0 0 0;
        }
      }
      &__year {
        margin: 4px 0 0 0;
        font-size: 0.95rem;
        font-weight: 400;
        color: var(--color-text-secondary);
        opacity: 0.8;
        @include media-down(xl) {
          font-size: 0.9rem;
          margin: 2px 0 0 0;
        }
      }
      &__count {
        margin: 32px 0;
        @include media-down(xl) {
          margin: 16px 0;
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
          margin-top: 24px;
          display: flex;
          justify-content: center;
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
