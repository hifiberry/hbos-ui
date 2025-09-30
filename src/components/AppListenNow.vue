<template>
  <button class="app-listen-now" @click="emit('click')">
    <span class="listen-now-icon">
      <AppIcon icon="play" />
    </span>
    <span class="listen-now-text">Listen Now</span>
  </button>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

const emit = defineEmits(['click'])
</script>

<style scoped lang="scss">
.app-listen-now {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-link);
  .listen-now {
    &-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--primary);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s linear;
      svg {
        color: #fff;
      }
    }
    &-text {
      font-weight: 500;
      text-decoration: underline;
      text-decoration-color: transparent;
      transition: all 0.2s linear;
      text-align: left;
    }
  }
  &:hover {
    .listen-now-icon {
      transform: scale(1.1);
    }
    .listen-now-text {
      text-decoration-color: var(--color-link);
    }
  }
}
</style>
