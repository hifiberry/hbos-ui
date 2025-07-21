<template>
  <div class="volume-control">
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
  min-width: 160px;
  max-width: 200px;
  width: auto; // Don't try to fill container

  .volume-slider-container {
    flex: 1;
    max-width: 120px;
    min-width: 80px;
    display: flex;
    align-items: center;

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

@include media-down(lg) {
  .volume-control {
    display: none;
  }
}
</style>
