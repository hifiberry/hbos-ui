<template>
  <div class="now-playing now-playing--minimal">
    <!-- Hide the title in minimal view -->
    <h1 class="now-playing__title" style="display: none;">
      <router-link to="/now-playing-minimal" class="title-link">
        Now Playing
        <span class="minimal-hint">Switch to minimal view</span>
      </router-link>
    </h1>

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

      <AppAudioControls class="now-playing__audio-controls" />

      <AppProgressControl class="now-playing__progress-control" isDraggable />

      <!-- Volume control -->
      <div class="now-playing__volume">
        <AppVolumeControl size="wide" />
      </div>
    </div>

    <!-- Exit hint for minimal view -->
    <div class="exit-hint">
      Use browser back button to return to normal view
    </div>
  </div>
</template>

<script setup lang="ts">
import AppCover from '@/components/app-cover.vue'
import AppProgressControl from '@/components/app-progress-control.vue'
import AppAudioControls from '@/components/app-audio-controls.vue'
import AppVolumeControl from '@/components/app-volume-control.vue'
import { rewrite_audiocontrol_api_url } from '@/api/player'

import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player.ts'

const { currentSong: song } = storeToRefs(usePlayerStore())
</script>

<style lang="scss">
@use '@/assets/scss/mixins' as *;

.now-playing {
  display: flex;
  flex-direction: column;
  min-width: 100%;
  height: 100%;

  // Minimal view specific overrides
  &--minimal {
    height: 100vh;
    width: 100vw;
    position: fixed;
    top: 0;
    left: 0;
    background: var(--background-primary);
    z-index: 1000;
  }

  &__title {
    @include media-down(sm) {
      display: none;
    }

    .title-link {
      color: var(--color-text);
      text-decoration: none;
      position: relative;
      display: inline-block;
      transition: color 0.3s ease;

      &:hover {
        color: var(--color-accent);
        cursor: pointer;

        .minimal-hint {
          opacity: 1;
          visibility: visible;
        }
      }
    }

    .minimal-hint {
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: var(--background-secondary);
      color: var(--color-text-secondary);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 400;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
      margin-top: 8px;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

      &::before {
        content: '';
        position: absolute;
        top: -4px;
        left: 50%;
        transform: translateX(-50%);
        border: 4px solid transparent;
        border-bottom-color: var(--background-secondary);
      }
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

    // Minimal view adjustments
    .now-playing--minimal & {
      background-color: transparent;
      box-shadow: none;
      border-radius: 0;
      justify-content: center;
      height: 100%;
    }

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
    margin-bottom: 20px; /* Add space between track info and controls */
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

  &__volume {
    width: 66%; /* Increased from 60% - now 10% wider */
    max-width: 440px; /* Increased from 400px proportionally */
    display: flex;
    justify-content: center;
    margin-bottom: 40px; /* 40px space at bottom */

    @include media-down(lg) {
      width: 88%; /* Increased from 80% proportionally */
    }

    @include media-down(md) {
      width: 100%; /* Keep at 100% on mobile */
    }
  }
}

// Exit hint for minimal view
.exit-hint {
  position: absolute;
  bottom: 15px;
  right: 15px;
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  opacity: 0.5;
  transition: opacity 0.3s ease;

  &:hover {
    opacity: 0.8;
  }

  @include media-down(sm) {
    bottom: 10px;
    right: 10px;
    font-size: 0.7rem;
  }
}
</style>
