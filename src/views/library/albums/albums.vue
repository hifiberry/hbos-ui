<template>
  <div class="albums">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'library' }">Albums</AppBackRouter>
      <div class="search-bar">
        <AppSearch
          v-model="search"
          :debounce="300"
          placeholder="Search albums..."
          @change="onSearch"
        />
      </div>
    </div>
    <div class="card">
      <AppPosterGrid
        :loading="loading"
        :loaded="loaded"
        :items="sortedAlbumsByReleaseDate"
        @click="(album) => router.push({ name: 'album', params: { albumId: album.id } })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useRouter } from 'vue-router'
const router = useRouter()

import { storeToRefs } from 'pinia'

import AppBackRouter from '@/components/app-back-router.vue'
import AppSearch from '@/components/app-search.vue'

import { useAlbumStore } from '@/stores/album.ts'
import AppPosterGrid from '@/components/app-poster-grid.vue'

const albumStore = useAlbumStore()
const { loading, loaded, sortedAlbumsByReleaseDate } = storeToRefs(albumStore)
const { getAlbums, clearSearch } = albumStore

const search = ref<string>('')

const onSearch = (searchValue: string) => {
  search.value = searchValue
  albumStore.setSearchQuery(searchValue)
}

onMounted(() => {
  getAlbums()
  // Clear any existing search when component mounts
  clearSearch()
  search.value = ''
})
</script>

<style scoped lang="scss">
.albums {
  .breadcrumbs {
    display: flex;
    align-items: center;
    justify-content: space-between;
    .search-bar {
      max-width: 200px;
    }
  }
}
</style>
