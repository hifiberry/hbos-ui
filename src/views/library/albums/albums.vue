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
        @contextmenu="onAlbumContextMenu"
      />
    </div>

    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="album-context-menu"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      >
        <button @click="playNow" class="ctx-item">Play now</button>
        <button @click="addToQueue" class="ctx-item">Add to queue</button>
        <button v-if="supportsDelete" @click="deleteAlbum" class="ctx-item ctx-item--danger">Delete album</button>
      </div>
    </Teleport>
  </PageContent>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'

import { useRouter } from 'vue-router'
const router = useRouter()

import { storeToRefs } from 'pinia'

import PageContent from '@/components/PageContent.vue'
import CustomSearchField from '@/components/CustomSearchField.vue'
import SortSelector from '@/components/SortSelector.vue'
import Icon from '@/components/Icon.vue'

import { useAlbumStore } from '@/stores/album.ts'
import { usePlayerStore } from '@/stores/player.ts'
import { useToastStore } from '@/stores/toast'
import { useLibraryStore } from '@/stores/library'
import { useLibraryFetch } from '@/composables/useLibraryFetch.ts'
import PosterGrid from '@/components/PosterGrid.vue'
import { deleteAlbum as apiDeleteAlbum } from '@/api/audiocontrol-library'

const albumStore = useAlbumStore()
const { loading, loaded, sortedAlbums, sortBy, sortOrder, genres, selectedGenres } = storeToRefs(albumStore)
const { getAlbums, clearSearch, setSortBy, toggleSortOrder, shuffleAlbums, loadGenres, setGenreFilter } = albumStore

const search = ref<string>('')
const genreOpen = ref(false)
const genreDropdownRef = ref<HTMLElement | null>(null)

const playerStore = usePlayerStore()
const toastStore = useToastStore()
const libraryStore = useLibraryStore()
const { supportsDelete, activeLibrary } = storeToRefs(libraryStore)
const libraryFetch = useLibraryFetch()

const contextMenu = reactive({ visible: false, x: 0, y: 0, albumId: '' })

const onAlbumContextMenu = (album: { id: string }, event: MouseEvent) => {
  contextMenu.albumId = album.id
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
  contextMenu.visible = true
}

const closeContextMenu = () => { contextMenu.visible = false }

const fetchAlbumTracks = async (albumId: string) => {
  const { data } = await libraryFetch(`/library/:activeLibrary/album/by-id/${albumId}`).json()
  return (data.value?.album?.tracks as Array<{ id?: string; uri?: string }>) || []
}

const playNow = async () => {
  const albumId = contextMenu.albumId
  closeContextMenu()
  try {
    const tracks = await fetchAlbumTracks(albumId)
    if (!tracks.length) return
    await playerStore.sendCommand('pause')
    await playerStore.sendCommand('clear_queue')
    for (const track of tracks) {
      await playerStore.addTrackToQueue(track as Parameters<typeof playerStore.addTrackToQueue>[0])
    }
    await playerStore.sendLibraryCommand('play')
  } catch (err) {
    toastStore.showErrorToast('Failed to play album')
  }
}

const addToQueue = async () => {
  const albumId = contextMenu.albumId
  closeContextMenu()
  try {
    const tracks = await fetchAlbumTracks(albumId)
    for (const track of tracks) {
      await playerStore.addTrackToQueue(track as Parameters<typeof playerStore.addTrackToQueue>[0])
    }
  } catch (err) {
    toastStore.showErrorToast('Failed to add album to queue')
  }
}

const deleteAlbum = async () => {
  const albumId = contextMenu.albumId
  closeContextMenu()
  if (!confirm('Delete this album from the filesystem? This cannot be undone.')) return
  try {
    await apiDeleteAlbum(activeLibrary.value!, albumId)
    toastStore.showSuccessToast('Album deleted')
    await getAlbums()
  } catch (err) {
    toastStore.showErrorToast('Failed to delete album')
  }
}

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

const onDocumentClick = (event: MouseEvent) => {
  onClickOutside(event)
  if (contextMenu.visible) closeContextMenu()
}

onMounted(async () => {
  getAlbums()
  clearSearch()
  search.value = ''
  await loadGenres()
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
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

:global(.album-context-menu) {
  position: fixed;
  z-index: 1000;
  background: var(--background-card);
  border: 1px solid var(--color-header-border);
  border-radius: 6px;
  padding: 4px 0;
  min-width: 140px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

:global(.album-context-menu .ctx-item) {
  display: block;
  width: 100%;
  padding: 8px 14px;
  background: none;
  border: none;
  text-align: left;
  font-size: 13px;
  color: var(--color-head);
  cursor: pointer;
}

:global(.album-context-menu .ctx-item:hover) {
  background: var(--background-start-skeleton);
}

:global(.album-context-menu .ctx-item--danger) {
  color: #c0392b;
}

:global(.album-context-menu .ctx-item--danger:hover) {
  background: rgba(192, 57, 43, 0.1);
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
