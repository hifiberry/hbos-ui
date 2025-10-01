<template>
  <div class="app-progress-control">
    <ProgressTime
      v-if="!isOnHeader"
      :seekPositionTime="audioControls.seekPositionTime"
      :songDurationTime="audioControls.songDurationTime"
    />

    <ProgressSlider
      :value="audioControls.seekPosition"
      :disabled="isSendingCommand || !caps.canSeek"
      :min="min"
      :max="max"
      :step="step"
      :hasThumb="hasThumb"
      :isDraggable="isDraggable"
      :isOnHeader="isOnHeader"
      @click:progress="audioControls.seekToPosition"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useAudioControls } from '@/stores/audio-controls'

import ProgressSlider from '@/components/ProgressSlider.vue'
import ProgressTime from '@/components/ProgressTime.vue'

interface ProgressControlProps {
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
} = defineProps<ProgressControlProps>()

const { isSendingCommand, playerCapabilities: caps } = storeToRefs(usePlayerStore())
const audioControls = useAudioControls()
</script>

<style lang="scss">
.app-progress-control {
  width: 100%;
}
</style>
