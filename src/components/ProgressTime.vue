<template>
  <div class="app-progress-time">
    <template v-if="hasSongDurationTime">
      <span>{{ seekPositionTime }}</span>
      <span>{{ songDurationTime }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface ProgressTime {
  seekPositionTime?: string
  songDurationTime?: string
}

const { seekPositionTime = '00:00', songDurationTime = '00:00' } = defineProps<ProgressTime>()

const hasSongDurationTime = computed(() => songDurationTime !== '00:00')
</script>

<style lang="scss">
.app-progress-time {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
  min-height: 14px;
}
</style>
