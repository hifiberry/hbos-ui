<template>
  <button :disabled>
    <AppIcon v-bind="$attrs" />
  </button>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

defineOptions({
  inheritAttrs: false,
})

interface AudioControlsProps {
  disabled?: boolean
}

const { disabled = false } = defineProps<AudioControlsProps>()
</script>

<style scoped lang="scss">
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;

  svg {
    pointer-events: none;
  }
}
</style>
