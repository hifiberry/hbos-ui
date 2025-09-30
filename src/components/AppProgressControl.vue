<template>
  <div class="app-progress-control">
    <AppProgressTime
      v-if="!isOnHeader"
      :seekPositionTime="audioControls.seekPositionTime"
      :songDurationTime="audioControls.songDurationTime"
    />

    <AppProgressSlider
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

import AppProgressSlider from '@/components/AppProgressSlider.vue'
import AppProgressTime from '@/components/AppProgressTime.vue'

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

const { isSendingCommand, playerCapabilities: caps } = storeToRefs(usePlayerStore())
const audioControls = useAudioControls()
</script>

<style lang="scss">
.app-progress-control {
  width: 100%;
}
</style>
