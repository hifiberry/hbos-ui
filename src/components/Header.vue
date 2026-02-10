<template>
  <header class="app-header">
    <!-- Player (left side) -->
    <div class="header-column header-column--player">
      <SongControlInfo isOnHeader />
    </div>

    <!-- Volume -->
    <div class="header-column header-column--volume">
      <VolumeControl size="compact" />
    </div>
  </header>
</template>

<script setup lang="ts">
import SongControlInfo from '@/components/SongControlInfo.vue'
import VolumeControl from '@/components/VolumeControl.vue'
</script>

<style scoped lang="scss">
.app-header {
  background-color: var(--background-header);
  padding: 20px 15px;
  border-bottom: 1px solid var(--color-header-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 80px;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9;
  width: 100%;

  @include media-down(lg) {
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
</style>
