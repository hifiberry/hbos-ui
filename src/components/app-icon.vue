<template>
  <inline-svg
    :class="['app-icon']"
    :width="width"
    :height="height"
    :src="imgUrl"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InlineSvg from 'vue-inline-svg'

interface IconSvgProps {
  icon?: string
  width?: number | string
  height?: number | string
}

const { icon = 'logo', width = 24, height = 24 } = defineProps<IconSvgProps>()

const imgUrl = computed(() => `/images/svg/${icon}.svg`)
</script>

<style scoped lang="scss">
svg {
  color: var(--color-icon);
  transition: all 0.2s linear;
}
</style>
