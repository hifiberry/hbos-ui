<template>
  <div class="now-playing">
    <h1 class="now-playing__title">Now Playing</h1>

    <div class="now-playing__player">
      <AppCover class="now-playing__cover" :src="song?.thumbnail" alt="Horsepower" />

      <div class="now-playing__info">
        <h2>{{ song?.title || 'Song Name' }}</h2>
        <p>{{ song?.artist || 'Artist' }}</p>
      </div>

      <AppProgressControl class="now-playing__progress-control" isDraggable />

      <AppAudioControls class="now-playing__audio-controls" />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppCover from '@/components/app-cover.vue'
import AppProgressControl from '@/components/app-progress-control.vue'
import AppAudioControls from '@/components/app-audio-controls.vue'

import { storeToRefs } from 'pinia'
import { useSongsStore } from '@/stores/songs'

const songsStore = useSongsStore()

const { song } = storeToRefs(songsStore)
const { getSongById } = songsStore

getSongById('')
</script>

<style lang="scss">
.now-playing {
  display: flex;
  flex-direction: column;
  min-width: 100%;
  height: 100%;

  &__title {
    @include media-down(sm) {
      display: none;
    }
  }

  &__player {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    border-radius: 10px;
    padding: $padding-main-content;
    background-color: var(--background-main-content);
    box-shadow: $box-shadow-main-content;
  }

  &__cover {
    margin-top: auto;
    margin-bottom: 20px;
  }

  &__info {
    text-align: center;
    margin: auto 0 50px;
    font-size: 18px;
  }

  &__progress-control {
    width: 60%;
    margin-bottom: 32px;

    @include media-down(lg) {
      width: 80%;
    }

    @include media-down(md) {
      width: 100%;
    }
  }

  &__audio-controls {
    margin-bottom: 20px;
  }
}
</style>
