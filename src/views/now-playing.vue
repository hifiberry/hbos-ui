<template>
  <div class="now-playing">
    <h1>Now Playing</h1>

    <div class="now-playing__player">
      <h2>Song Name</h2>

      <AppAudioControls />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppAudioControls from '@/components/app-audio-controls.vue'
</script>

<style lang="scss">
.now-playing {
  display: flex;
  flex-direction: column;
  min-width: 100%;
  height: 100%;

  &__player {
    flex: 1;
    border-radius: 10px;
    padding: $padding-main-content;
    background-color: var(--background-main-content);
    box-shadow: $box-shadow-main-content;
  }
}
</style>
