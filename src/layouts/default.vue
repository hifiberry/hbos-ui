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
  width: 100dvw;
  height: 100dvh;
  display: grid;
  grid-template-columns: max-content 1fr;
  grid-template-rows: max-content 1fr;
  grid-template-areas:
    "header header"
    "sidebar main";

  main {
    padding: 30px 20px 30px 80px;
    grid-area: main;
  }
}
</style>
