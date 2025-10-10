<template>
  <div class="now-playing">
    <PageContent
      title="Now Playing"
      hintLink="/now-playing-minimal"
      hintString="Switch to minimal view"
      class="now-playing__page-content"
    >
      <div class="now-playing__player">
        <div
          class="now-playing__cover-container"
          @mouseenter="showTooltip = true"
          @mouseleave="showTooltip = false"
          @mousemove="updateTooltipPosition"
        >
          <CoverArt
            class="now-playing__cover"
            :song="song"
            size="large"
            :adaptToContainer="true"
            @loaded="onCoverArtLoaded"
            @error="onCoverArtError"
          />

          <!-- Metadata Tooltip -->
          <MetadataTooltip
            v-if="showTooltip && song"
            :song="song"
            class="now-playing__metadata-tooltip"
            :style="tooltipStyles"
          />
        </div>

        <div class="now-playing__info">
          <h2 v-if="song?.title">{{ song.title }}</h2>
          <p v-if="song?.artist">{{ song.artist }}</p>
        </div>

        <AudioControls class="now-playing__audio-controls" />

        <ProgressControl class="now-playing__progress-control" isDraggable />

        <!-- Volume control -->
        <div class="now-playing__volume">
          <VolumeControl size="wide" />
        </div>
      </div>
    </PageContent>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import CoverArt from '@/components/CoverArt.vue'
import PageContent from '@/components/PageContent.vue'
import ProgressControl from '@/components/ProgressControl.vue'
import AudioControls from '@/components/AudioControls.vue'
import VolumeControl from '@/components/VolumeControl.vue'
import MetadataTooltip from '@/components/MetadataTooltip.vue'

import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player.ts'

const { currentSong: song } = storeToRefs(usePlayerStore())

// Cover art event handlers
const onCoverArtLoaded = (result: { success: boolean; urls: string[]; source: string }) => {
  console.log('Cover art loaded for now-playing:', result)
}

const onCoverArtError = (error: string) => {
  console.warn('Cover art error in now-playing:', error)
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
.now-playing {
  display: flex;
  flex-direction: column;
  min-width: 100%;
  height: 100%;

  &__page-content {
    display: flex;
    flex-direction: column;
    flex-grow: 1;

    .content {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
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

    @include media-down(sm) {
      padding-top: 24px;
    }
  }

  &__cover {
    max-height: calc(100vh - 420px);
    min-height: 120px;
    overflow: hidden;

    flex: 1 1 auto;
    margin-top: auto;
    margin-bottom: 32px;

    // Maintain square aspect ratio
    aspect-ratio: 1 / 1;
    width: auto;
    max-width: 100%;

    @include media-down(sm) {
      margin-bottom: 24px;
    }
  }

  &__cover-container {
    max-height: calc(100vh - 420px);
    min-height: 120px;
    overflow: hidden;
    position: relative;
    cursor: help;

    flex: 1 1 auto;
    margin-top: auto;
    margin-bottom: 32px;

    // Maintain square aspect ratio
    aspect-ratio: 1 / 1;
    width: auto;
    max-width: 100%;

    @include media-down(sm) {
      margin-bottom: 24px;
    }

    .now-playing__cover {
      height: 100%;
      width: 100%;
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
</style>
