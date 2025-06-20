<template>
  <AppProgressSlider
    :value="audioControls.seekPosition"
    :disabled="audioControls.isSendingCommand"
    :min="min"
    :max="max"
    :step="step"
    :hasThumb="hasThumb"
    :isDraggable="isDraggable"
    :isOnHeader="isOnHeader"
    @click:progress="audioControls.seekToPosition"
  />
</template>

<script setup lang="ts">
import { useAudioControls } from '@/stores/audio-controls'

import AppProgressSlider from '@/components/app-progress-slider.vue'

interface AppProgressControlProps {
  min?: number
  max?: number
  step?: number
  hasThumb?: boolean
  isDraggable?: boolean
  isOnHeader?: boolean
}

const {
  min = 0,
  max = 100,
  step = 1,
  hasThumb = true,
  isDraggable = false,
  isOnHeader = false,
} = defineProps<AppProgressControlProps>()

const audioControls = useAudioControls()
</script>

<style lang="scss"></style>
