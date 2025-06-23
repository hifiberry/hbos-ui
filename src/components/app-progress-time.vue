<template>
  <div class="app-progress-time">
    <span>{{ seekPositionTime }}</span>
    <span>{{ songDurationTime }}</span>
  </div>
</template>

<script setup lang="ts">
interface AppProgressTime {
  seekPositionTime?: string
  songDurationTime?: string
}

const { seekPositionTime = '00:00', songDurationTime = '00:00' } = defineProps<AppProgressTime>()
</script>

<style lang="scss">
.app-progress-time {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
}
</style>
