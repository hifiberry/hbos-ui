<template>
  <div class="albums">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'library' }">Albums</AppBackRouter>
      <div class="controls">
        <AppSortSelector
          :sort-by="sortBy"
          :sort-order="sortOrder"
          @sort-by-change="setSortBy"
          @toggle-order="toggleSortOrder"
        />
        <div class="search-bar">
          <AppSearch
            v-model="search"
            :debounce="300"
            placeholder="Search albums..."
            @change="onSearch"
          />
        </div>
      </div>
    </div>
    <div class="card">
      <AppPosterGrid
        :loading="loading"
        :loaded="loaded"
        :items="sortedAlbums"
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
import AppSortSelector from '@/components/app-sort-selector.vue'

import { useAlbumStore } from '@/stores/album.ts'
import AppPosterGrid from '@/components/app-poster-grid.vue'

const albumStore = useAlbumStore()
const { loading, loaded, sortedAlbums, sortBy, sortOrder } = storeToRefs(albumStore)
const { getAlbums, clearSearch, setSortBy, toggleSortOrder } = albumStore

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

    .controls {
      display: flex;
      align-items: center;
      gap: 16px;

      .search-bar {
        max-width: 200px;
      }
    }
  }
}
</style>
