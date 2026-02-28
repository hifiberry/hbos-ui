<template>
  <PageContent title="Albums" :backrouterLink="{ name: 'library' }">
    <div class="controls-bar">
      <div class="controls-row">
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
      <div v-if="genres.length > 0" class="genre-filter">
        <button
          v-for="genre in genres"
          :key="genre"
          :class="['genre-chip', { active: selectedGenres.includes(genre) }]"
          @click="toggleGenre(genre)"
        >
          {{ genre }}
        </button>
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
const { loading, loaded, sortedAlbums, sortBy, sortOrder, genres, selectedGenres } = storeToRefs(albumStore)
const { getAlbums, clearSearch, setSortBy, toggleSortOrder, shuffleAlbums, loadGenres, setGenreFilter } = albumStore

const search = ref<string>('')

const handleSortByChange = (newSortBy: 'release_date' | 'artist' | 'random') => {
  if (newSortBy === 'random') {
    shuffleAlbums()
  } else {
    setSortBy(newSortBy)
  }
}

const handleToggleOrder = () => {
  if (sortBy.value === 'release_date') {
    toggleSortOrder()
  }
}

const onSearch = (searchValue: string) => {
  search.value = searchValue
  albumStore.setSearchQuery(searchValue)
}

const toggleGenre = (genre: string) => {
  const current = [...selectedGenres.value]
  const idx = current.indexOf(genre)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(genre)
  }
  setGenreFilter(current)
}

onMounted(async () => {
  getAlbums()
  clearSearch()
  search.value = ''
  await loadGenres()
})
</script>

<style scoped lang="scss">
.controls-bar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 16px;

  .search-bar {
    max-width: 200px;
  }
}

.genre-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.genre-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 14px;
  background-color: var(--color-background-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--color-primary);
  }

  &.active {
    background-color: var(--color-primary);
    border-color: var(--color-primary);
    color: var(--color-primary-text);
  }
}
</style>
