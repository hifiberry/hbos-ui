<template>
  <router-link :to="to" v-bind="$attrs" class="back-router">
    <AppIcon icon="caret-down" />
    <span class="h1">
      <slot />
    </span>
  </router-link>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

interface BackRouterProps {
  to: string | object
}
const { to = '' } = defineProps<BackRouterProps>()
</script>

<style scoped lang="scss">
.back-router {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 28px;
  @include media-down(lg) {
    min-height: 24px;
  }
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
