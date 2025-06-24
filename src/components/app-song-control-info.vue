<template>
  <div :class="['song-control-info', { card: isOnSticky }]">
    <div v-if="song" class="song-control-info__box">
      <div class="song-control-info__cover">
        <AppCover :src="song.thumbnail" />
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
import { onMounted } from 'vue'

import AppAudioControls from '@/components/app-audio-controls.vue'
import AppProgressControl from '@/components/app-progress-control.vue'
import AppCover from '@/components/app-cover.vue'
import AppMarquee from '@/components/app-marquee.vue'

import { storeToRefs } from 'pinia'
import { useSongsStore } from '@/stores/songs'
const { song } = storeToRefs(useSongsStore())
const songsStore = useSongsStore()
const { getSongById } = songsStore

interface AudioSongControlInfoProps {
  isOnSticky?: boolean
}

const { isOnSticky = false } = defineProps<AudioSongControlInfoProps>()

onMounted(() => {
  getSongById('')
})
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
      width: 40px;
      height: 40px;
      min-width: auto;
      min-height: auto;
    }
  }
  &__box {
    display: flex;
    gap: 10px;
    align-items: center;
    width: calc(100% - 120px);
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
