<template>
  <RouterView />
</template>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useAudioControls } from '@/stores/audio-controls'

const playerStore = usePlayerStore()
const audioControls = useAudioControls()

playerStore.initPlayer()

onBeforeUnmount(() => {
  if (audioControls.progressIntervalID) {
    audioControls.stopAutoProgress()
  }

  if (playerStore.updateIntervalID) {
    playerStore.clearPollingInterval()
  }
})
</script>
