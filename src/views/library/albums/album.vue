<template>
  <div class="album">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'albums' }">Album Name</AppBackRouter>
    </div>
    <div class="grid">
      <div class="col-6 card">{{ albumStore.album }}</div>
      <div class="col-6 card"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'

import AppBackRouter from '@/components/app-back-router.vue'

import { useAlbumsStore } from '@/stores/albums'
const albumStore = useAlbumsStore()

import { useRoute } from 'vue-router'
const route = useRoute()

const id = computed(() => route.params.id as string)

onMounted(() => {
  albumStore.getAlbumById(id.value as string)
})
</script>

<style scoped lang="scss"></style>
