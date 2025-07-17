<template>
  <div class="now-playing">
    <h1 class="now-playing__title">Now Playing</h1>

    <div class="now-playing__player">
      <AppCover
        class="now-playing__cover"
        :src="rewrite_audiocontrol_api_url(song?.cover_art_url || '')"
        :alt="song?.artist || song?.title || 'Now Playing'"
      />

      <div class="now-playing__info">
        <h2 v-if="song?.title">{{ song.title }}</h2>
        <p v-if="song?.artist">{{ song.artist }}</p>
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
import { rewrite_audiocontrol_api_url } from '@/api/player'

import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player.ts'

const { currentSong: song } = storeToRefs(usePlayerStore())
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
    display: flex;
    flex-grow: 1;
    flex-direction: column;
    align-items: center;
    border-radius: 10px;
    padding: $padding-main-content;
    padding-top: 32px;
    background-color: var(--background-main-content);
    box-shadow: $box-shadow-main-content;

    @include media-down(sm) {
      padding-top: 24px;
    }
  }

  &__cover {
    height: calc(100vh - 500px);
    min-height: 120px;
    overflow: hidden;

    flex: 1 1 auto;
    margin-top: auto;
    margin-bottom: 32px;

    @include media-down(sm) {
      margin-bottom: 24px;
    }
  }

  &__info {
    margin-top: auto;
    text-align: center;
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
