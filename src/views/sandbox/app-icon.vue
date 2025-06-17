<template>
  <div class="sandbox-app-icons">
    <AppIcon v-for="icon in icons" :key="icon" :icon="icon" />
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/app-icon.vue'

const icons: string[] = [
  'users-thin',
  'moon-thin',
  'caret-down',
  'music-note-simple-light',
  'notebook-thin',
  'play-light',
  'play',
  'pause',
  'prev',
  'next',
  'shuffle',
  'loop',
]
</script>

<style scoped lang="scss">
.sandbox-app-icons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 30px;
}
</style>
