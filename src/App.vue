<template>
  <RouterView />
</template>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useAudioControls } from '@/stores/audio-controls'

const { initPlayer } = usePlayerStore()
const audioControls = useAudioControls()

initPlayer()

onBeforeUnmount(() => {
  if (audioControls.progressInterval) {
    audioControls.stopAutoProgress()
  }
})
</script>
