<template>
  <div class="album">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'albums' }">Album Name</AppBackRouter>
    </div>
    <div class="grid">
      <div class="col-6 card"></div>
      <div class="col-6 card"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppBackRouter from '@/components/app-back-router.vue'
</script>

<style scoped lang="scss"></style>
