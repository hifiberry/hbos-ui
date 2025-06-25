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
          <AppSkeleton class="skeleton-cover" height="40px" />
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
          @click="onAddTrackToQueue(track)"
        >
          <div class="track-item__num">{{ index + 1 }}</div>
          <div class="track-item__cover">
            <AppCover :src="''" />
          </div>
          <div class="track-item__desc">
            <div class="h3 track-item__desc-name">
              <AppMarquee>{{ track.name }}</AppMarquee>
            </div>
            <div class="track-item__desc-artist">
              <AppMarquee>{{ track.artist }}</AppMarquee>
            </div>
          </div>
          <!--          <div class="track-item__duration">{{ formatTime(track.duration) }}</div>-->
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppCover from '@/components/app-cover.vue'
import AppSkeleton from '@/components/skeletons/app-skeleton.vue'
import AppMarquee from '@/components/app-marquee.vue'

import type { Track } from '@/types/library'

interface TracksProps {
  tracks: Track[]
  loading?: boolean
  albumId?: string
}

const { tracks = [], loading = false } = defineProps<TracksProps>()

import { formatTime } from '@/helpers/formatTime'

import { usePlayerStore } from '@/stores/player.ts'
import { useAudioControls } from '@/stores/audio-controls'

const playerStore = usePlayerStore()
const audioControls = useAudioControls()

const onAddTrackToQueue = async (track: Track) => {
  if (audioControls.isPlayingOrPaused) {
    await playerStore.sendCommand('stop')
    await playerStore.sendCommand('clear_queue')
    await playerStore.addTrackToQueue(track)

    audioControls.togglePlayPause()
  } else {
    await playerStore.addTrackToQueue(track)

    audioControls.togglePlayPause()
  }
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
      grid-template-columns: 20px 40px minmax(150px, 400px) minmax(50px, auto);
      align-items: center;
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
      }
      &__cover {
        :deep(.app-cover) {
          width: 40px;
          height: 40px;
          border-radius: 5px;
          overflow: hidden;
          svg {
            width: 50%;
            height: 50%;
          }
        }
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
      &__duration {
        text-align: right;
        font-size: 14px;
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
      &.skeleton-item {
        grid-template-columns: 20px 40px 1fr 50px;
      }
    }
  }
}
</style>
