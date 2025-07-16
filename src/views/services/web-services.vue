<template>
  <div class="web-services">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'services' }">Web Services</AppBackRouter>
    </div>

    <div class="web-services-content">
      <div class="coming-soon">
        <AppIcon icon="cloud" class="coming-soon-icon" />
        <h2>Coming Soon</h2>
        <p>Web services integration is currently in development and will be available in a future update.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/app-icon.vue'
import AppBackRouter from '@/components/app-back-router.vue'
</script>

<style scoped lang="scss">
.web-services {
  .breadcrumbs {
    margin-bottom: 32px;
  }

  .web-services-content {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
  }

  .coming-soon {
    text-align: center;
    max-width: 400px;

    .coming-soon-icon {
      width: 64px;
      height: 64px;
      color: var(--color-body-secondary);
      margin-bottom: 24px;
    }

    h2 {
      margin: 0 0 16px 0;
      color: var(--color-head);
      font-size: 2rem;
    }

    p {
      margin: 0;
      color: var(--color-body-secondary);
      line-height: 1.6;
      font-size: 1.125rem;
    }
  }
}
</style>
