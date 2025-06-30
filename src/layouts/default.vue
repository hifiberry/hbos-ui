<template>
  <div class="wrapper">
    <AppHeader :isPlayerControls="isPlayerControls" />
    <AppSidebar :isPlayerControls="isPlayerControls" />
    <main :class="[{ 'no-player-controls': !isPlayerControls }]">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()

import AppHeader from '@/components/app-header.vue'
import AppSidebar from '@/components/app-sidebar.vue'

const slickPlayerControlsExceptions: string[] = ['now-playing']

const isPlayerControls = computed(
  () => !slickPlayerControlsExceptions.includes(route.name as string),
)
</script>

<style scoped lang="scss">
.wrapper {
  height: 100dvh;
  display: flex;
  flex-direction: column;

  main {
    padding: 104px 24px 48px 80px;
    flex: 1;
    @include media-down(lg) {
      padding: 15px 15px 170px;
    }
    &.no-player-controls {
      padding-bottom: 20px;
      @include media-down(lg) {
        padding-bottom: 100px;
      }
    }
  }
}
</style>
