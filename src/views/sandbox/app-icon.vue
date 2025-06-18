<template>
  <div class="sandbox-app-icons">
    <div v-for="icon in icons" :key="icon" class="sandbox-app-icons__icon">
      <p>{{ icon }}</p>
      <AppIcon :icon="icon" />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/app-icon.vue'

const icons: string[] = [
  'music-note-simple-light',
  'users-thin',
  'moon-thin',
  'caret-down',
  'notebook-thin',
  'play-light',
  'playlist-light',
  'play',
  'pause',
  'prev',
  'next',
  'shuffle',
  'loop',
  'music',
  'loading',
]
</script>

<style scoped lang="scss">
.sandbox-app-icons {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 30px;

  &__icon {
    text-align: center;
    padding: 12px;
    border: 1px solid lightblue;

    p {
      margin-bottom: 12px;
    }
  }
}
</style>
