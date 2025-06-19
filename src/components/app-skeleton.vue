<template>
  <div class="skeleton">&nbsp;</div>
</template>

<script setup lang="ts">
defineProps({
  height: {
    type: String,
  },
  width: {
    type: String,
  },
  borderRadius: {
    type: String,
  },
})
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
  border-radius: v-bind(borderRadius);
  background: linear-gradient(
    90deg,
    var(--background-start-skeleton) 25%,
    var(--background-end-skeleton) 50%,
    var(--background-start-skeleton) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  flex: none;
}
</style>
