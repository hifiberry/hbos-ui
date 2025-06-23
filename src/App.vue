<template>
  <RouterView />
</template>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import { useAudioControls } from '@/stores/audio-controls'

const audioControls = useAudioControls()

audioControls.initPlayer()

onBeforeUnmount(() => {
  if (audioControls.progressInterval) {
    audioControls.stopAutoProgress()
  }
})
</script>
