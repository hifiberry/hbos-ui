<template>
  <RouterView />
</template>

<script setup lang="ts">
import { useAudioControls } from '@/stores/audio-controls'

const audioControls = useAudioControls()

audioControls.initPlayer()
</script>
