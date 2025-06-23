<template>
  <div class="sandbox-app-progress-time">
    <AppProgressTime :songDurationTime :seekPositionTime />

    <AppProgressSlider
      :value="seekPosition"
      :isDraggable="true"
      @click:progress="onClickSeekPosition"
    />
  </div>

  <br />
  <br />
  <br />

  <h2>On Playing</h2>

  <div class="sandbox-app-progress-time">
    <AppProgressTime :songDurationTime :seekPositionTime="seekPositionTimeInterval" />

    <AppProgressSlider
      :value="intervalPosition"
      :isDraggable="true"
      @click:progress="onClickSeekPositionInterval"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import AppProgressTime from '@/components/app-progress-time.vue'
import AppProgressSlider from '@/components/app-progress-slider.vue'

import { formatTime } from '@/helpers/formatTime'

const seekPosition = ref(50)

const songDuration = 30

const songDurationTime = formatTime(songDuration)

const seekPositionTime = computed(() =>
  formatTime((songDuration * (seekPosition.value || 0)) / 100),
)

const onClickSeekPosition = (progress: number) => {
  seekPosition.value = progress
}

// Innerval On Playing

const intervalPosition = ref(0)

const onClickSeekPositionInterval = (progress: number) => {
  intervalPosition.value = progress
}

const seekPositionTimeInterval = computed(() =>
  formatTime((songDuration * (intervalPosition.value || 0)) / 100),
)

const delta = +(10 / songDuration).toFixed(9)

// console.log('delta', delta)

const intervalID = setInterval(() => {
  intervalPosition.value = +(intervalPosition.value + delta).toFixed(9)

  // console.log('intervalPosition', intervalPosition.value)

  if (intervalPosition.value >= 100) {
    clearInterval(intervalID)

    intervalPosition.value = 0
  }
}, 100)

onBeforeUnmount(() => {
  if (intervalID) {
    clearInterval(intervalID)
  }
})
</script>

<style lang="scss">
.sandbox-app-progress-time {
  width: 350px;
}
</style>
