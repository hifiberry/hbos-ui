<template>
  <div>
    <AppIcon
      v-for="icon in icons"
      :key="icon"
      :icon="icon"
    />
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/app-icon.vue'

const icons: string[] = ['moon-thin']
</script>

<style scoped lang="scss">

</style>
