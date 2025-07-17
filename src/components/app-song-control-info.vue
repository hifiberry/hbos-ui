<template>
  <div :class="['song-control-info', { card: isOnSticky }]">
    <div v-if="song" class="song-control-info__box" @click="goToNowPlaying">
      <div class="song-control-info__cover">
        <AppCover :src="rewrite_audiocontrol_api_url(song.cover_art_url || '')" :alt="song.artist || 'Artist'" />
      </div>
      <div class="song-control-info__attr">
        <div class="h3">
          <AppMarquee>
            {{ song.title }}
          </AppMarquee>
        </div>

        <p>
          <AppMarquee>{{ song.artist }}</AppMarquee>
        </p>
      </div>
    </div>

    <div class="song-control-info__controls">
      <AppAudioControls isSeparate :isOnSticky="isOnSticky" />

      <AppProgressControl v-if="!isOnSticky" isOnHeader isDraggable />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppAudioControls from '@/components/app-audio-controls.vue'
import AppProgressControl from '@/components/app-progress-control.vue'
import AppCover from '@/components/app-cover.vue'
import AppMarquee from '@/components/app-marquee.vue'
import { rewrite_audiocontrol_api_url } from '@/api/player'

import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player.ts'

const router = useRouter()
const { currentSong: song } = storeToRefs(usePlayerStore())

interface AudioSongControlInfoProps {
  isOnSticky?: boolean
}

const { isOnSticky = false } = defineProps<AudioSongControlInfoProps>()

const goToNowPlaying = () => {
  router.push({ name: 'now-playing' })
}
</script>

<style scoped lang="scss">
.song-control-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  &__cover {
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 5px;
    overflow: hidden;
    &:deep(.app-cover) {
      width: 100%;
      height: 100%;
      svg {
        width: 50%;
        height: 50%;
      }
    }
  }
  &__box {
    display: flex;
    gap: 10px;
    align-items: center;
    width: calc(100% - 120px);
    cursor: pointer;
    border-radius: 8px;
    padding: 4px;
    transition: all 0.2s ease;

    &:hover {
      background-color: var(--color-background-hover, rgba(255, 255, 255, 0.05));

      .h3 {
        color: var(--color-head);
      }

      p {
        color: var(--color-body-primary);
      }
    }

    &__attr {
      flex: 1;
    }
  }
  &__attr {
    color: var(--color-body-secondary);
    max-width: 260px;
    min-width: 100px;
    .h3 {
      margin-bottom: 3px;
    }
  }
  &.card {
    background-color: var(--background-sidebar);
    border-radius: 10px;
    padding: 12px;
    box-shadow: $box-shadow-main-content;
  }
}
</style>
