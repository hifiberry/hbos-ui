<template>
  <button>
    <AppIcon v-bind="$attrs"/>
  </button>
</template>

<script setup lang="ts">
import AppIcon from '@/components/app-icon.vue'

defineOptions({
  inheritAttrs: false
})
</script>

<style scoped lang="scss">

</style>
