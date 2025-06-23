<template>
  <router-link :to="to" v-bind="$attrs" class="back-router">
    <AppIcon icon="caret-down" />
    <span class="h1">
      <slot />
    </span>
  </router-link>
</template>

<script setup lang="ts">
import AppIcon from '@/components/app-icon.vue'

defineProps<{
  to: string | object
}>()
</script>

<style scoped lang="scss">
.back-router {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  .h1 {
    margin-bottom: 0;
    text-decoration: underline;
    text-decoration-color: transparent;
    transition: all 0.2s linear;
  }
  svg {
    transform: rotate(90deg);
    color: var(--color-icon-primary);
    transition: all 0.2s linear;
  }
  &:hover {
    .h1 {
      text-decoration-color: var(--color-head);
    }
    svg {
      transform: rotate(90deg) translateY(2px);
    }
  }
}
</style>
