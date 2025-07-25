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
      <div
        class="now-playing__cover-container"
        @mouseenter="showTooltip = true"
        @mouseleave="showTooltip = false"
        @mousemove="updateTooltipPosition"
      >
        <AppCoverArt
          class="now-playing__cover"
          :song="song"
          size="large"
          :adaptToContainer="true"
          @loaded="onCoverArtLoaded"
          @error="onCoverArtError"
        />

        <!-- Metadata Tooltip -->
        <AppMetadataTooltip
          v-if="showTooltip && song"
          :song="song"
          class="now-playing__metadata-tooltip"
          :style="tooltipStyles"
        />
      </div>      <div class="now-playing__info">
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
import { ref, computed } from 'vue'
import AppCoverArt from '@/components/app-cover-art.vue'
import AppProgressControl from '@/components/app-progress-control.vue'
import AppAudioControls from '@/components/app-audio-controls.vue'
import AppVolumeControl from '@/components/app-volume-control.vue'
import AppMetadataTooltip from '@/components/app-metadata-tooltip.vue'

import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player.ts'

const { currentSong: song } = storeToRefs(usePlayerStore())

// Cover art event handlers
const onCoverArtLoaded = (result: { success: boolean; urls: string[]; source: string }) => {
  console.log('Cover art loaded for now-playing-minimal:', result)
}

const onCoverArtError = (error: string) => {
  console.warn('Cover art error in now-playing-minimal:', error)
}

// Tooltip state
const showTooltip = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)

// Update tooltip position based on mouse movement
const updateTooltipPosition = (event: MouseEvent) => {
  tooltipX.value = event.clientX
  tooltipY.value = event.clientY
}

// Computed styles for tooltip positioning with boundary detection
const tooltipStyles = computed(() => {
  const tooltipWidth = 350 // Approximate tooltip width
  const tooltipHeight = 200 // Approximate tooltip height
  const offset = 10

  let left = tooltipX.value + offset
  let top = tooltipY.value - offset

  // Adjust if tooltip would go off the right edge
  if (left + tooltipWidth > window.innerWidth) {
    left = tooltipX.value - tooltipWidth - offset
  }

  // Adjust if tooltip would go off the bottom edge
  if (top + tooltipHeight > window.innerHeight) {
    top = tooltipY.value - tooltipHeight - offset
  }

  // Ensure tooltip doesn't go off the left edge
  if (left < offset) {
    left = offset
  }

  // Ensure tooltip doesn't go off the top edge
  if (top < offset) {
    top = offset
  }

  return {
    left: `${left}px`,
    top: `${top}px`,
    position: 'fixed' as const
  }
})
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
    position: relative;

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

  &__cover-container {
    height: calc(100vh - 500px);
    min-height: 120px;
    overflow: hidden;
    position: relative;
    cursor: help;

    flex: 1 1 auto;
    margin-top: auto;
    margin-bottom: 32px;

    @include media-down(sm) {
      margin-bottom: 24px;
    }

    .now-playing__cover {
      height: 100%;
      margin: 0;
    }
  }

  &__metadata-tooltip {
    pointer-events: none;
    z-index: 1000;
  }

  &__info {
    margin-top: auto;
    text-align: center;
    font-size: 18px;
    margin-bottom: 20px; /* Add space between track info and controls */

    // Larger font sizes for ultra-wide screens (>2000px)
    @media (min-width: 2000px) {
      font-size: 20px; /* Slightly increased from 18px */
      margin-bottom: 24px; /* Slightly more space */

      h2 {
        font-size: 2rem; /* More moderate increase */
        font-weight: 600;
        margin-bottom: 8px;
      }

      p {
        font-size: 1.25rem; /* More moderate increase */
        font-weight: 400;
        opacity: 0.8;
      }
    }
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
