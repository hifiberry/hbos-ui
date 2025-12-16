<template>
  <header class="app-header">
    <!-- Player (left side) -->
    <div class="header-column header-column--player">
      <SongControlInfo isOnHeader />
    </div>

    <!-- Spacer -->
    <div class="header-spacer"></div>

    <!-- Volume -->
    <div class="header-column header-column--volume">
      <VolumeControl size="compact" />
    </div>

    <!-- Spacer -->
    <div class="header-spacer"></div>

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
import SongControlInfo from '@/components/SongControlInfo.vue'
import VolumeControl from '@/components/VolumeControl.vue'

// Dark mode
const isDark = useDark()
const toggleDark = useToggle(isDark)

// Logo URL (optional)
const logoUrl = computed(() => `${import.meta.env.BASE_URL}images/logo.svg`)
</script>

<style scoped lang="scss">
.app-header {
  background-color: var(--background-header);
  padding: 20px 15px;
  border-bottom: 1px solid var(--color-header-border);
  display: grid;
  grid-template-columns: auto 1fr auto 1fr 80px; /* player | spacer | volume | spacer | actions */
  align-items: center;
  height: 80px;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9;
  width: 100%;

  @media (max-width: 1024px) { /* breakpoint for tablets/mobiles */
    display: none; /* hide completely */
  }
}

.header-column {
  display: flex;
  align-items: center;

  &--player {
    justify-content: flex-start;
  }

  &--volume {
    justify-content: center;
  }

  &--actions {
    justify-content: flex-end;
  }
}

.header-spacer {
  /* hidden on small screens via parent */
}
</style>
