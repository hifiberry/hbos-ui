<template>
  <div class="now-playing-minimal">
    <!-- Minimal now playing without header/sidebar -->
    <div class="minimal-player">
      <!-- Album art and main info -->
      <div class="album-section">
        <div class="album-cover">
          <AppCover
            v-if="song?.cover_art_url"
            :src="rewrite_audiocontrol_api_url(song.cover_art_url)"
            :alt="song?.artist || song?.title || 'Album cover'"
            size="large"
          />
          <div v-else class="no-cover">
            <AppIcon name="music" size="120" />
          </div>
        </div>

        <div class="track-info">
          <h1 class="track-title">{{ song?.title || 'No title' }}</h1>
          <h2 class="track-artist">{{ song?.artist || 'Unknown artist' }}</h2>
          <h3 class="track-album">{{ song?.album || 'Unknown album' }}</h3>
        </div>
      </div>

      <!-- Player controls -->
      <div class="player-controls">
        <AppAudioControls />
        <AppProgressControl class="progress-control" isDraggable />
      </div>

      <!-- Volume control -->
      <div class="volume-section">
        <AppVolumeControl size="normal" />
      </div>

      <!-- Exit hint -->
      <div class="exit-hint">
        Use browser back button to return to normal view
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { rewrite_audiocontrol_api_url } from '@/api/player'
import AppCover from '@/components/app-cover.vue'
import AppIcon from '@/components/app-icon.vue'
import AppAudioControls from '@/components/app-audio-controls.vue'
import AppProgressControl from '@/components/app-progress-control.vue'
import AppVolumeControl from '@/components/app-volume-control.vue'

const playerStore = usePlayerStore()
const { currentSong: song } = storeToRefs(playerStore)
</script>

<style scoped lang="scss">
@use '@/assets/scss/mixins' as *;

.now-playing-minimal {
  height: 100vh;
  width: 100vw;
  background: var(--background-primary);
  color: var(--color-text);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.minimal-player {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 90vw;
  width: 100%;
  height: 100%;
  padding: 20px;
  text-align: center;
  gap: 20px;
}

.album-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  flex: 1;
  justify-content: center;
}

.album-cover {
  width: 400px;
  height: 400px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);

  .no-cover {
    width: 100%;
    height: 100%;
    background: var(--background-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary);
  }

  @include media-down(lg) {
    width: 350px;
    height: 350px;
  }

  @include media-down(md) {
    width: 300px;
    height: 300px;
  }

  @include media-down(sm) {
    width: 250px;
    height: 250px;
  }
}

.track-info {
  max-width: 600px;

  .track-title {
    font-size: 2.5rem;
    font-weight: 600;
    margin: 0 0 10px 0;
    color: var(--color-text);

    @include media-down(md) {
      font-size: 2rem;
    }

    @include media-down(sm) {
      font-size: 1.5rem;
    }
  }

  .track-artist {
    font-size: 1.5rem;
    font-weight: 400;
    margin: 0 0 8px 0;
    color: var(--color-text-secondary);

    @include media-down(md) {
      font-size: 1.25rem;
    }

    @include media-down(sm) {
      font-size: 1rem;
    }
  }

  .track-album {
    font-size: 1.125rem;
    font-weight: 300;
    margin: 0;
    color: var(--color-text-tertiary);

    @include media-down(md) {
      font-size: 1rem;
    }

    @include media-down(sm) {
      font-size: 0.875rem;
    }
  }
}

.player-controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  max-width: 600px;

  .progress-control {
    width: 100%;
  }
}

.volume-section {
  width: 70%; /* 70% of the progress control width */
  max-width: 420px; /* 70% of 600px */
  display: flex;
  justify-content: center;

  :deep(.volume-control) {
    max-width: none;
    width: 100%;
    justify-content: center;

    .volume-slider-container {
      max-width: 280px; /* 70% of 400px */
      min-width: 175px; /* 70% of 250px */
    }
  }
}

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
