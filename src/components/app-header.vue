<template>
  <header>
    <router-link to="/">
      <img src="/images/logo.svg" alt="">
    </router-link>

    <div>
      <AppIconButton
        icon="moon-thin"
        @click="toggleDark()"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
import { useDark, useToggle } from "@vueuse/core"
const isDark = useDark()
const toggleDark = useToggle(isDark)

import AppIconButton from '@/components/app-icon-button.vue'
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
  flex: none;
  @include media-breakpoint-down(lg) {
    background-color: transparent;
    border: none;
    padding: 10px 15px;
    height: auto;
  }
}
</style>
