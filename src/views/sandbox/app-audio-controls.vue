<template>
  <div class="sandbox-audio-controls">
    <div class="sandbox-audio-controls__block">
      <h1>On Now Playing:</h1>

      <AppAudioControls />
    </div>

    <div class="sandbox-audio-controls__block">
      <h1>On the Header:</h1>

      <AppAudioControls isSeparate />
    </div>

    <div class="sandbox-audio-controls__block">
      <h1>On the Sticky:</h1>

      <AppAudioControls isSeparate isOnSticky />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppAudioControls from '@/components/app-audio-controls.vue'
</script>

<style scoped lang="scss">
.sandbox-audio-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
  text-align: center;
  padding: 30px;

  &__block {
    width: 100%;
    padding: 12px 0;
    border-top: 1px solid lightblue;
    border-bottom: 1px solid lightblue;
  }
}
</style>
