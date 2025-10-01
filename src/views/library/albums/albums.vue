<template>
  <div class="albums">
    <div class="breadcrumbs">
      <BackRouter :to="{ name: 'library' }">Albums</BackRouter>
      <div class="controls">
        <SortSelector
          :sort-by="sortBy"
          :sort-order="sortOrder"
          @sort-by-change="handleSortByChange"
          @toggle-order="handleToggleOrder"
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
      <PosterGrid
        :loading="loading"
        :loaded="loaded"
        :items="sortedAlbums"
        @click="(album) => router.push({ name: 'album', params: { albumId: album.id }, query: { from: 'albums' } })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useRouter } from 'vue-router'
const router = useRouter()

import { storeToRefs } from 'pinia'

import BackRouter from '@/components/BackRouter.vue'
import AppSearch from '@/components/AppSearch.vue'
import SortSelector from '@/components/SortSelector.vue'

import { useAlbumStore } from '@/stores/album.ts'
import PosterGrid from '@/components/PosterGrid.vue'

const albumStore = useAlbumStore()
const { loading, loaded, sortedAlbums, sortBy, sortOrder } = storeToRefs(albumStore)
const { getAlbums, clearSearch, setSortBy, toggleSortOrder } = albumStore

const search = ref<string>('')

const handleSortByChange = (newSortBy: 'release_date' | 'artist') => {
  setSortBy(newSortBy)
}

const handleToggleOrder = () => {
  // Only toggle order for release_date (year) sorting
  if (sortBy.value === 'release_date') {
    toggleSortOrder()
  }
}

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
