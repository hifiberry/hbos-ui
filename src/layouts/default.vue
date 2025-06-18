<template>
  <div class="wrapper">
    <AppHeader />
    <AppSidebar />
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/app-header.vue'
import AppSidebar from '@/components/app-sidebar.vue'
</script>

<style scoped lang="scss">
.wrapper {
  //width: 100dvw;
  height: 100dvh;
  display: flex;
  flex-direction: column;

  main {
    padding: 24px 24px 48px 80px;
    flex: 1;
    @include media-breakpoint-down(lg) {
      padding: 15px 15px 170px;
    }
  }
}
</style>
