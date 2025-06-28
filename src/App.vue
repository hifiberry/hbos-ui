<template>
  <RouterView />
</template>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import { usePlayerWebSocket } from '@/stores/player-web-socket'
import { usePlayerStore } from '@/stores/player'
import { useAudioControls } from '@/stores/audio-controls'

const playerStore = usePlayerStore()
const audioControls = useAudioControls()
const playerWebSocket = usePlayerWebSocket()

playerStore.initPlayer()

onBeforeUnmount(() => {
  if (audioControls.progressIntervalID) {
    audioControls.stopAutoProgress()
  }

  if (playerStore.updateIntervalID) {
    playerStore.clearPollingInterval()
  }

  if (playerWebSocket.wsController) {
    playerWebSocket.wsController.disconnect()
    playerWebSocket.wsController = null
  }
})
</script>
