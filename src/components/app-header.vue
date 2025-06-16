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
$header-light-bg: $color-white;
$header-light-border-color: $color-grey;

$header-dark-bg: $color-white-rgba-20;
header {
  grid-area: header;
  background-color: $header-light-bg;
  padding: 20px 15px;
  border-bottom: 1px solid $header-light-border-color;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80px;
  @include dark {
    background-color: $header-dark-bg;
    border-color: transparent;
  }
}
</style>
