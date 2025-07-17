<template>
  <div class="music-files">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'services' }">Music Files</AppBackRouter>
    </div>

    <div class="music-files-content">
      <div class="coming-soon">
        <AppIcon icon="nas" class="coming-soon-icon" />
        <h2>Coming soon</h2>
        <p>Music file management features will be available in a future update</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/app-icon.vue'
import AppBackRouter from '@/components/app-back-router.vue'
</script>

<style scoped lang="scss">
.music-files {
  .coming-soon {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 24px;
    text-align: center;
    min-height: 400px;

    .coming-soon-icon {
      width: 64px;
      height: 64px;
      margin-bottom: 24px;
      color: var(--color-text-secondary);
      opacity: 0.6;
    }

    h2 {
      margin: 0 0 16px 0;
      color: var(--color-head);
      font-size: 32px;
      font-weight: 600;
    }

    p {
      margin: 0;
      color: var(--color-text-secondary);
      font-size: 16px;
      max-width: 400px;
    }
  }
}
</style>
