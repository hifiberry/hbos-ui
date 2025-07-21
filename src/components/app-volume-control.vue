<template>
  <div :class="['volume-control', `volume-control--${props.size}`]">
    <svg class="volume-icon volume-icon--mute" width="27" height="27" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M15 8a5 5 0 0 1 1.912 4.934m-1.377 2.602a5 5 0 0 1 -.535 .464" />
      <path d="M17.7 5a9 9 0 0 1 2.362 11.086m-1.676 2.299a9 9 0 0 1 -.686 .615" />
      <path d="M9.069 5.054l.431 -.554a.8 .8 0 0 1 1.5 .5v2m0 4v8a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l1.294 -1.664" />
      <path d="M3 3l18 18" />
    </svg>
    <div class="volume-slider-container">
      <AppProgressSlider
        :value="displayVolume"
        :min="0"
        :max="100"
        :step="1"
        :disabled="false"
        :has-thumb="true"
        :is-draggable="true"
        :is-on-header="true"
        @click:progress="handleVolumeChange"
      />
    </div>
    <svg class="volume-icon volume-icon--speaker" width="27" height="27" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M15 8a5 5 0 0 1 0 8" />
      <path d="M17.7 5a9 9 0 0 1 0 14" />
      <path d="M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import AppProgressSlider from '@/components/app-progress-slider.vue'

// Props for size variants
interface Props {
  size?: 'compact' | 'normal' | 'wide' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'compact'
})

const playerStore = usePlayerStore()
const { currentData } = storeToRefs(playerStore)

// Computed properties
const currentVolume = computed(() => currentData.value?.volume ?? 50)

const displayVolume = computed(() => {
  return currentVolume.value
})

// Methods
const handleVolumeChange = (newVolume: number) => {
  playerStore.setVolume(newVolume)
}
</script>

<style scoped lang="scss">
@use '@/assets/scss/mixins' as *;

.volume-control {
  display: flex;
  align-items: center;
  gap: 12px;

  // Compact size (for header)
  &--compact {
    min-width: 160px;
    max-width: 200px;
    width: auto;

    .volume-slider-container {
      flex: 1;
      max-width: 150px;
      min-width: 100px;
      display: flex;
      align-items: center;
    }

    // In the simple header layout, allow wider volume control
    .header--simple & {
      max-width: none;
      min-width: 50%;
      width: 90%;

      .volume-slider-container {
        max-width: none;
        min-width: 50%;
        width: 85%;
      }
    }
  }

  // Normal size (for now-playing view)
  &--normal {
    width: 100%;
    max-width: none;
    min-width: 220px; // Increased from 200px

    .volume-slider-container {
      flex: 1;
      max-width: none;
      min-width: 180px; // Increased from 150px
      display: flex;
      align-items: center;
    }
  }

  // Wide size (for now-playing view - 10% wider than normal)
  &--wide {
    width: 100%;
    max-width: none;
    min-width: 250px; // Even wider than normal

    .volume-slider-container {
      flex: 1;
      max-width: none;
      min-width: 220px; // Significantly wider slider
      display: flex;
      align-items: center;
    }
  }

  // Large size (for expanded/full-screen views)
  &--large {
    width: 100%;
    max-width: none;
    min-width: 300px;

    .volume-slider-container {
      flex: 1;
      max-width: none;
      min-width: 200px;
      display: flex;
      align-items: center;
    }
  }

  .volume-slider-container {
    // Counter the margin-top from is-on-header to center properly
    margin-top: -4px;

    @include media-down(md) {
      margin-top: -3px;
    }
  }

  .volume-icon {
    flex-shrink: 0;
    color: var(--color-icon);
    transition: all 0.2s linear;
    @include audio-control-stroke;

    &--mute {
      opacity: 0.6;
    }

    &--speaker {
      opacity: 0.8;
    }
  }
}

@include media-down(md) {
  .volume-control {
    display: none;
  }
}
</style>
