<template>
  <div class="app-songs-card card">
    <div class="h4 title">Songs</div>
    <div class="song-list">
      <template v-if="loading">
        <div
          v-for="(_, index) in 5"
          :key="`song-skeleton-${index}`"
          class="song-item skeleton-item"
        >
          <div class="song-item__num">{{ index + 1 }}</div>
          <AppSkeleton class="skeleton-cover" height="40px" />
          <div class="skeleton-desc">
            <AppSkeleton width="30%" height="100%" class="h4" />
            <AppSkeleton width="30%" height="100%" />
          </div>
          <AppSkeleton class="skeleton-duration" />
        </div>
      </template>

      <template v-else>
        <div v-for="(song, index) in songs" :key="song.id" class="song-item">
          <div class="song-item__num">{{ index + 1 }}</div>
          <div class="song-item__cover">
            <AppCover :src="song.thumbnail" />
          </div>
          <div class="song-item__desc">
            <div class="h3 song-item__desc-name">
              <AppMarquee>{{ song.title }}</AppMarquee>
            </div>
            <div class="song-item__desc-artist">
              <AppMarquee>{{ song.artist }}</AppMarquee>
            </div>
          </div>
          <div class="song-item__duration">{{ formatTime(song.duration) }}</div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppCover from '@/components/app-cover.vue'
import AppSkeleton from '@/components/skeletons/app-skeleton.vue'
import AppMarquee from '@/components/app-marquee.vue'

import type { Song } from '@/types/library'

interface SongsProps {
  songs: Song[]
  loading?: boolean
}

const { songs = [], loading = false } = defineProps<SongsProps>()

import { formatTime } from '@/helpers/formatTime'
</script>

<style scoped lang="scss">
.app-songs-card {
  .title {
    margin-bottom: 20px;
  }
  .song {
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
          width: 100%;
          height: 100%;
          border-radius: 5px;
          overflow: hidden;
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
        .song-item__desc {
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
