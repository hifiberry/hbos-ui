<template>
  <div class="sandbox-view">
    <RouterLink :to="route.name == 'sandbox' ? '/' : '/sandbox'">
      <h2 class="sandbox-view__back">
        <AppIcon icon="prev" /> {{ route.name == 'sandbox' ? 'Home' : 'Back' }}
      </h2>
    </RouterLink>

    <router-view />
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppIcon from '@/components/app-icon.vue'

const route = useRoute()

console.log('route', route)
</script>

<style scoped lang="scss">
.sandbox-view {
  padding: 30px;

  &__back {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}
</style>
