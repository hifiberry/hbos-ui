<template>
  <button :disabled>
    <AppIcon v-bind="$attrs" />
  </button>
</template>

<script setup lang="ts">
import AppIcon from '@/components/app-icon.vue'

defineOptions({
  inheritAttrs: false,
})

interface AppAudioControlsProps {
  disabled?: boolean
}

const { disabled = false } = defineProps<AppAudioControlsProps>()
</script>

<style scoped lang="scss">
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
