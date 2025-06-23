<template>
  <div class="app-button">
    <div class="link">
      <router-link to="#" class="text-link">View All</router-link>
    </div>
    <div class="buttons">
      <AppListenNow />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppListenNow from '@/components/app-listen-now.vue'
</script>

<style scoped lang="scss">
.app-button {
  & > div {
    margin-bottom: 20px;
  }
}
</style>
