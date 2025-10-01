<template>
  <div :class="['skeleton', { 'skeleton--circle': shape === 'circle' }]">&nbsp;</div>
</template>

<script setup lang="ts">
interface SkeletonProps {
  width?: string
  height?: string
  shape?: 'circle' | 'square'
}
const { width = '100%', height = 'auto', shape = 'square' } = defineProps<SkeletonProps>()
</script>

<style lang="scss" scoped>
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton {
  width: v-bind(width);
  height: v-bind(height);
  background: linear-gradient(
    90deg,
    var(--background-start-skeleton) 25%,
    var(--background-end-skeleton) 50%,
    var(--background-start-skeleton) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  flex: none;
  &--circle {
    border-radius: 50%;
  }
}
</style>
