<template>
  <div class="radio">
    <div class="breadcrumbs">
      <h1>Radio</h1>
    </div>

    <div class="radio-content">
      <div class="empty-state">
        <AppIcon icon="music" class="empty-icon" />
        <h2>Radio Stations</h2>
        <p>Radio functionality coming soon</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/app-icon.vue'
</script>

<style scoped lang="scss">
.radio {
  .breadcrumbs {
    margin-bottom: 32px;

    h1 {
      margin: 0;
      color: var(--color-head);
    }
  }

  .radio-content {
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 50vh;
      text-align: center;
      max-width: 400px;
      margin: 0 auto;

      .empty-icon {
        width: 80px;
        height: 80px;
        margin-bottom: 24px;
        color: var(--color-body-secondary);
        opacity: 0.5;
      }

      h2 {
        margin-bottom: 12px;
        color: var(--color-body-primary);
      }

      p {
        color: var(--color-body-secondary);
        line-height: 1.5;
      }
    }
  }
}
</style>
