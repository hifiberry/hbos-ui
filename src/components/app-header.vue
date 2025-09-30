<template>
  <header :class="{ 'header--simple': !isPlayerControls }">
    <!-- Column 1: Logo -->
    <div class="header-column header-column--logo">
      <router-link to="/">
        <img :src="logoUrl" alt="" />
      </router-link>
    </div>

    <!-- Spacer 1 -->
    <div class="header-spacer"></div>

    <!-- Column 2: Song Info + Player Controls Combined -->
    <div v-if="isPlayerControls" class="header-column header-column--player">
      <AppSongControlInfo isOnHeader />
    </div>

    <!-- Spacer 2 (only show when player controls are visible) -->
    <div v-if="isPlayerControls" class="header-spacer"></div>

    <!-- Column 3: Volume Control (only show when player controls are visible) -->
    <div v-if="isPlayerControls" class="header-column header-column--volume">
      <AppVolumeControl size="compact" />
    </div>

    <!-- Spacer 3 (only show when player controls are visible) -->
    <div v-if="isPlayerControls" class="header-spacer"></div>

    <!-- Column 4: Dark Mode Toggle -->
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

import AppSongControlInfo from '@/components/app-song-control-info.vue'
import AppVolumeControl from '@/components/AppVolumeControl.vue'

interface HeaderProps {
  isPlayerControls?: boolean
}
const { isPlayerControls = true } = defineProps<HeaderProps>()
</script>

<style scoped lang="scss">
@use '@/assets/scss/mixins' as *;

header {
  background-color: var(--background-header);
  padding: 20px 15px;
  border-bottom: 1px solid var(--color-header-border);
  display: grid;
  grid-template-columns: 160px 1fr auto 1fr 200px 1fr 160px; // Logo (147px + padding), spacer, player, spacer, volume, spacer, dark-mode (same width as logo)
  align-items: center;
  height: 80px;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9;
  width: 100%;

  // Simple layout for now-playing screen (no player controls, no volume)
  &.header--simple {
    grid-template-columns: 160px 1fr 160px; // Logo, spacer, dark-mode
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

  @include media-down(lg) {
    display: flex;
    align-items: center;
  }

  &--logo {
    justify-content: flex-start;

    @include media-down(lg) {
      width: auto;
      flex: 0 0 auto;
    }

    a {
      display: flex;
      align-items: center;
      padding: 0;
      margin: 0;
      height: 100%; // Fill the full header height
    }

    img {
      margin: 0;
      padding: 0;
      height: 40px; // Set a proper height instead of max-width
      width: auto; // Let width adjust proportionally
    }
  }

  &--player {
    justify-content: center;

    @include media-down(lg) {
      display: none;
    }
  }

  &--volume {
    justify-content: center;

    @include media-down(lg) {
      flex: 0 0 auto;
    }
  }

  &--actions {
    justify-content: flex-end;

    @include media-down(lg) {
      flex: 1;
      justify-content: flex-end;
    }
  }
}

// Spacer columns that expand
.header-spacer {
  @include media-down(lg) {
    display: none;
  }
}
</style>

<!-- Global styles for header button -->
<style lang="scss">
@use '@/assets/scss/mixins' as *;

.header-column--actions button {
  padding: 0 !important;
  margin: 0 !important;
  background: none !important;
  border: none !important;
  min-width: auto !important;
  width: auto !important;
  height: auto !important;

  .dark-mode-icon {
    color: var(--color-icon);
    opacity: 0.8;
    transition: all 0.2s linear;
    @include audio-control-stroke;
  }
}
</style>
