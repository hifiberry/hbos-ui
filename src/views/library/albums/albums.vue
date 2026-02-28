<template>
  <PageContent title="Albums" :backrouterLink="{ name: 'library' }">
    <div class="breadcrumbs">
      <div class="controls">
        <SortSelector
          :sort-by="sortBy"
          :sort-order="sortOrder"
          @sort-by-change="handleSortByChange"
          @toggle-order="handleToggleOrder"
        />
        <div class="search-bar">
          <CustomSearchField
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
  </PageContent>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useRouter } from 'vue-router'
const router = useRouter()

import { storeToRefs } from 'pinia'

import PageContent from '@/components/PageContent.vue'
import CustomSearchField from '@/components/CustomSearchField.vue'
import SortSelector from '@/components/SortSelector.vue'

import { useAlbumStore } from '@/stores/album.ts'
import PosterGrid from '@/components/PosterGrid.vue'

const albumStore = useAlbumStore()
const { loading, loaded, sortedAlbums, sortBy, sortOrder } = storeToRefs(albumStore)
const { getAlbums, clearSearch, setSortBy, toggleSortOrder, shuffleAlbums } = albumStore

const search = ref<string>('')

const handleSortByChange = (newSortBy: 'release_date' | 'artist' | 'random') => {
  if (newSortBy === 'random') {
    // Always reshuffle, even if already in random mode
    shuffleAlbums()
  } else {
    setSortBy(newSortBy)
  }
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
