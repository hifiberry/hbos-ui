<template>
  <div class="settings">
    <h1>General sound settings</h1>

    <div class="settings-overview">
      <div class="service-card">
        <div class="service-header">
          <AppIcon icon="tabler/adjustments" class="service-icon" />
          <h2>General</h2>
        </div>
        <p class="service-description">
          Configure general sound options here.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/app-icon.vue'
</script>

<style scoped lang="scss">
.settings {
  h1 { margin-bottom: 32px; color: var(--color-head); }
  .settings-overview {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;
    .service-card {
      display: block; background: var(--background-card); border-radius: 8px; padding: 24px; border: 1px solid var(--color-border);
      .service-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
      .service-icon { width: 24px; height: 24px; color: var(--color-primary); }
      h2 { margin: 0; color: var(--color-head); font-size: 1.25rem; }
      .service-description { color: var(--color-body-secondary); line-height: 1.5; }
    }
  }
}
</style>
