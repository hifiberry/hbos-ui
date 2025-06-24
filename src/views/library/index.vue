<template>
  <div class="library">
    <h1>Music Library</h1>
    <AppArtists class="cell" />
    <AppAlbums />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

import AppArtists from '@/components/app-artists.vue'
import AppAlbums from '@/components/app-albums.vue'

import { useLibraryStore } from '@/stores/library'
const store = useLibraryStore()

onMounted(() => {
  store.getAvailableLibrary()
})
</script>

<style scoped lang="scss">
.library {
  .cell {
    margin-bottom: 55px;
    @include media-down(lg) {
      margin-bottom: 24px;
    }
  }
}
</style>
