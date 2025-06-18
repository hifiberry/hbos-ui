<template>
  <div :class="['song-control-info', { 'card': isOnSticky }]">
    <div v-if="songInfo" class="song-control-info__box">
      <div class="song-control-info__cover">
        <AppCover :src="songInfo.thumbnail"/>
      </div>
      <div class="song-control-info__attr">
        <div class="h3">{{ songInfo.title }}</div>
        <p>{{ songInfo.artist }}</p>
      </div>
    </div>

    <AppAudioControls isSeparate :isOnSticky="isOnSticky"/>
  </div>
</template>

<script setup lang="ts">
import AppAudioControls from '@/components/app-audio-controls.vue'
import AppCover from '@/components/app-cover.vue'

import { useSongInfo } from '@/stores/song-info'
const { songInfo } = useSongInfo()

interface AppAudioControlsProps {
  isOnSticky?: boolean
}

const { isOnSticky = false } = defineProps<AppAudioControlsProps>()
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
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
  }
  &__box {
    display: flex;
    gap: 10px;
    align-items: center;
    &__attr {
      flex: 1;
    }
  }
  &__attr {
    .h3 {
      margin-bottom: 3px;
      font-size: 18px;
    }
  }
  &.card {
    background-color: var(--background-sidebar);
    border-radius: 10px;
    padding: 12px;
    box-shadow: 0px 2px 8px 0px #0000000A;
  }
}
</style>
