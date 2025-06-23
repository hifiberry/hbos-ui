<template>
  <header>
    <router-link to="/">
      <img src="/images/logo.svg" alt="" />
    </router-link>

    <div v-if="isPlayerControls" class="header-controls">
      <AppSongControlInfo />
    </div>

    <div>
      <AppIconButton icon="moon-thin" @click="toggleDark()" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { useDark, useToggle } from '@vueuse/core'
const isDark = useDark()
const toggleDark = useToggle(isDark)

import AppIconButton from '@/components/app-icon-button.vue'
import AppSongControlInfo from '@/components/app-song-control-info.vue'

interface HeaderProps {
  isPlayerControls?: boolean
}
const { isPlayerControls = true } = defineProps<HeaderProps>()
</script>

<style scoped lang="scss">
header {
  background-color: var(--background-header);
  padding: 20px 15px;
  border-bottom: 1px solid var(--color-header-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80px;
  width: 100%;
  gap: 60px;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9;
  @include media-down(lg) {
    background-color: transparent;
    border: none;
    padding: 10px 15px;
    height: auto;
    position: static;
  }
}
.header-controls {
  min-width: 450px;
  max-width: 700px;
  @include media-down(lg) {
    display: none;
  }
}
</style>
