<template>
  <PageContent title="Albums" :backrouterLink="{ name: 'library' }">
    <div class="controls-bar">
      <SortSelector
        :sort-by="sortBy"
        :sort-order="sortOrder"
        @sort-by-change="handleSortByChange"
        @toggle-order="handleToggleOrder"
      />
      <div v-if="genres.length > 0" class="genre-dropdown" ref="genreDropdownRef">
        <button
          class="genre-dropdown-btn"
          :class="{ active: selectedGenres.length > 0 }"
          @click="genreOpen = !genreOpen"
        >
          Genre
          <span v-if="selectedGenres.length > 0" class="genre-count">{{ selectedGenres.length }}</span>
          <Icon icon="caret-down" :width="12" :height="12" class="genre-caret" />
        </button>
        <div v-if="genreOpen" class="genre-menu">
          <label
            v-for="genre in genres"
            :key="genre"
            class="genre-option"
          >
            <input
              type="checkbox"
              :checked="selectedGenres.includes(genre)"
              @change="toggleGenre(genre)"
            />
            {{ genre }}
          </label>
        </div>
      </div>
      <button
        :class="['shuffle-btn', { active: sortBy === 'random' }]"
        title="Shuffle"
        @click="handleSortByChange('random')"
      >
        <Icon icon="shuffle" :width="14" :height="14" />
      </button>
      <div class="search-bar">
        <CustomSearchField
          v-model="search"
          :debounce="300"
          placeholder="Search albums..."
          @change="onSearch"
        />
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
import { ref, onMounted, onUnmounted } from 'vue'

import { useRouter } from 'vue-router'
const router = useRouter()

import { storeToRefs } from 'pinia'

import PageContent from '@/components/PageContent.vue'
import CustomSearchField from '@/components/CustomSearchField.vue'
import SortSelector from '@/components/SortSelector.vue'
import Icon from '@/components/Icon.vue'

import { useAlbumStore } from '@/stores/album.ts'
import PosterGrid from '@/components/PosterGrid.vue'

const albumStore = useAlbumStore()
const { loading, loaded, sortedAlbums, sortBy, sortOrder, genres, selectedGenres } = storeToRefs(albumStore)
const { getAlbums, clearSearch, setSortBy, toggleSortOrder, shuffleAlbums, loadGenres, setGenreFilter } = albumStore

const search = ref<string>('')
const genreOpen = ref(false)
const genreDropdownRef = ref<HTMLElement | null>(null)

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

const onClickOutside = (event: MouseEvent) => {
  if (genreDropdownRef.value && !genreDropdownRef.value.contains(event.target as Node)) {
    genreOpen.value = false
  }
}

onMounted(async () => {
  getAlbums()
  clearSearch()
  search.value = ''
  await loadGenres()
  document.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>

<style scoped lang="scss">
.controls-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.search-bar {
  margin-left: auto;
  min-width: 160px;
  max-width: 220px;
}

.shuffle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--color-background-hover);
    border-color: var(--color-primary);
  }

  &.active {
    background: var(--color-primary);
    color: var(--color-primary-text);
    border-color: var(--color-primary);
  }
}

.genre-dropdown {
  position: relative;
}

.genre-dropdown-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: var(--color-background-hover);
    border-color: var(--color-primary);
  }

  &.active {
    background: var(--color-primary);
    color: var(--color-primary-text);
    border-color: var(--color-primary);
  }

  .genre-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.3);
    font-size: 11px;
    font-weight: 600;
  }

  .genre-caret {
    opacity: 0.7;
  }
}

.genre-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 100;
  background: var(--background-card, #1e1e1e);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 6px 0;
  min-width: 180px;
  max-height: 280px;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.genre-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  font-size: 14px;
  cursor: pointer;
  color: var(--color-text);
  text-transform: capitalize;

  &:hover {
    background: var(--color-background-hover);
  }

  input[type='checkbox'] {
    cursor: pointer;
    accent-color: var(--color-primary);
    width: 15px;
    height: 15px;
    flex-shrink: 0;
  }
}
</style>
