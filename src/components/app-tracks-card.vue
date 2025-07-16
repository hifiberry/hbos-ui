<template>
  <div class="app-tracks-card card">
    <div class="h4 title">Songs</div>
    <div class="track-list">
      <template v-if="loading">
        <div
          v-for="(_, index) in 5"
          :key="`track-skeleton-${index}`"
          class="track-item skeleton-item"
        >
          <div class="track-item__num">{{ index + 1 }}</div>
          <div class="skeleton-desc">
            <AppSkeleton width="30%" height="100%" class="h4" />
            <AppSkeleton width="30%" height="100%" />
          </div>
          <!--          <AppSkeleton class="skeleton-duration" />-->
        </div>
      </template>

      <template v-else>
        <div
          v-for="(track, index) in tracks"
          :key="`track-${index}`"
          class="track-item"
          :class="{ 'track-item--current': isCurrentTrack(track) }"
          @click="onAddTrackToQueue(track)"
        >
          <div class="track-item__num">{{ index + 1 }}</div>
          <div class="track-item__desc">
            <div class="h3 track-item__desc-name">
              <AppMarquee>{{ track.name }}</AppMarquee>
            </div>
            <div v-if="getTrackArtist(track)" class="track-item__desc-artist">
              <AppMarquee>{{ getTrackArtist(track) }}</AppMarquee>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import AppSkeleton from '@/components/skeletons/app-skeleton.vue'
import AppMarquee from '@/components/app-marquee.vue'

import type { Track, AlbumDetails } from '@/types/library'

interface TracksProps {
  tracks: Track[]
  loading?: boolean
  albumId?: string
  album?: AlbumDetails | null
}

const { tracks = [], loading = false, album = null } = defineProps<TracksProps>()

import { usePlayerStore } from '@/stores/player.ts'

const playerStore = usePlayerStore()
const { currentSong } = storeToRefs(playerStore)

// Function to check if a track is currently playing
const isCurrentTrack = (track: Track) => {
  if (!currentSong.value || !track) return false

  // Match by name and artist (Track uses 'name', currentSong uses 'title')
  const titleMatch = track.name === currentSong.value.title
  const artistMatch = track.artist === currentSong.value.artist

  return titleMatch && artistMatch
}

// Get artist name for a track, only show if different from album artist
const getTrackArtist = (track: Track) => {
  if (!track.artist) {
    return '' // No track artist, don't show anything
  }

  // If album has artists and track artist matches any of them, don't show
  if (album && album.artists && album.artists.length > 0) {
    const albumArtist = album.artists[0] // Primary album artist
    if (track.artist === albumArtist) {
      return '' // Same as album artist, don't show
    }
  }

  // Track artist is different from album artist, show it
  return track.artist
}

const onAddTrackToQueue = async (track: Track) => {
  // Pause the active player
  await playerStore.sendCommand('pause')
  await playerStore.sendCommand('clear_queue')

  // Track object already has the correct format for the store method
  await playerStore.addTrackToQueue(track)

  // Play from library player (not active player)
  await playerStore.sendLibraryCommand('play')
}
</script>

<style scoped lang="scss">
.app-tracks-card {
  .title {
    margin-bottom: 20px;
  }
  .track {
    &-item {
      display: grid;
      grid-template-columns: 20px minmax(150px, 1fr);
      align-items: start;
      gap: 8px;
      color: var(--color-body-secondary);
      cursor: pointer;
      &:not(:last-child) {
        margin-bottom: 40px;
        @include media-down(md) {
          margin-bottom: 24px;
        }
      }
      &__num {
        font-size: 14px;
        padding-top: 2px;
      }
      &__desc {
        .h3 {
          margin-bottom: 4px;
        }
        :deep(.marquee span) {
          text-decoration: underline;
          text-decoration-color: transparent;
          transition: all 0.2s linear;
        }
      }
      &:hover {
        .track-item__desc {
          &-name {
            :deep(.marquee span) {
              text-decoration-color: var(--color-head);
            }
          }
          &-artist {
            :deep(.marquee span) {
              text-decoration-color: var(--color-body-secondary);
            }
          }
        }
      }

      &--current {
        @include current-track-highlight;
      }

      &.skeleton-item {
        grid-template-columns: 20px 1fr;
      }
    }
  }
}
</style>
