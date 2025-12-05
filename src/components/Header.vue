<template>
  <header :class="{ 'header--simple': !isPlayerControls }">
    <!-- Player (now first column, left side) -->
    <div v-if="isPlayerControls" class="header-column header-column--player">
      <SongControlInfo isOnHeader />
    </div>

    <!-- Spacer (only show when player controls are visible) -->
    <div v-if="isPlayerControls" class="header-spacer"></div>

    <!-- Volume -->
    <div v-if="isPlayerControls" class="header-column header-column--volume">
      <VolumeControl size="compact" />
    </div>

    <!-- Spacer -->
    <div v-if="isPlayerControls" class="header-spacer"></div>

    <!-- Dark Mode Toggle -->
    <div class="header-column header-column--actions">
      <button @click="toggleDark()">
        <svg class="dark-mode-icon" width="27" height="27" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDark, useToggle } from '@vueuse/core'
const isDark = useDark()
const toggleDark = useToggle(isDark)

const logoUrl = computed(() => `${import.meta.env.BASE_URL}images/logo.svg`)

import SongControlInfo from '@/components/SongControlInfo.vue'
import VolumeControl from '@/components/VolumeControl.vue'

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
  display: grid;
  grid-template-columns: auto 1fr auto 1fr 80px;
  /* player | spacer | volume | spacer | actions */
  align-items: center;
  height: 80px;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9;
  width: 100%;

  &.header--simple {
    grid-template-columns: 1fr 80px;
    /* no player → just spacer + dark mode */
  }

  @include media-down(lg) {
    background-color: transparent;
    border: none;
    padding: 10px 15px;
    height: auto;
    position: static;
    display: flex;
    gap: 12px;
  }
}

.header-column {
  display: flex;
  align-items: center;

  &--player {
    justify-content: flex-start; /* left side */
    @include media-down(lg) {
      display: none;
    }
  }

  &--volume {
    justify-content: center;
  }

  &--actions {
    justify-content: flex-end;
    @include media-down(lg) {
      flex: 1;
      justify-content: flex-end;
    }
  }
}

.header-spacer {
  @include media-down(lg) {
    display: none;
  }
}
</style>
