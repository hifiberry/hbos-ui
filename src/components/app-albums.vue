<template>
  <div class="app-albums">
    <div :class="['album-grid', inRow ? 'row' : 'cell']">
      <AppPosterSkeleton v-if="loading" />

      <template v-else>
        <AppPoster
          v-for="album in data"
          :key="album.id"
          :title="album.name"
          :subtitle="`${album.release_date ? album.release_date.substring(0, 4) : 'Unknown year'} • ${album.tracks_count} track${album.tracks_count !== 1 ? 's' : ''}`"
          :src="albumStore.getAlbumCoverById(album.id)"
          @click="router.push({ name: 'album', params: { albumId: album.id } })"
        />
      </template>
    </div>

    <div v-if="loaded && data.length === 0" class="no-albums">No available albums found</div>
  </div>
</template>

<script setup lang="ts">
import type { Album } from '@/types/library'

interface AlbumsProps {
  loading?: boolean
  loaded?: boolean
  albums?: Album[]
  inRow?: boolean
}

const { loading = false, loaded = false, albums = [], inRow = false } = defineProps<AlbumsProps>()

import { useRouter } from 'vue-router'
const router = useRouter()

import AppPoster from '@/components/app-poster.vue'
import AppPosterSkeleton from '@/components/skeletons/app-poster-skeleton.vue'

import { useAlbumStore } from '@/stores/album.ts'
import { onMounted, onUnmounted, ref, watch } from 'vue'
const albumStore = useAlbumStore()

const chunkSize = 30
const currentPage = ref(0)
const data = ref<Album[]>([])

// Calculate how many items fit based on screen size
const getMaxItemsForRow = () => {
  if (!inRow) return 20 // For grid view, keep existing behavior

  const width = window.innerWidth

  // Desktop: 1 row, Mobile: 2 rows
  if (width >= 960) {
    // Desktop - calculate items that fit in one row
    // Item width: 140px + gap: 60px = 200px per item (with some padding)
    const availableWidth = width - 100 // Account for padding
    const itemsPerRow = Math.floor(availableWidth / 200)
    return Math.max(1, itemsPerRow) // At least 1 item
  } else {
    // Mobile - 2 rows, items are smaller (100px + 15px gap = 115px per item)
    const availableWidth = width - 60 // Account for padding
    const itemsPerRow = Math.floor(availableWidth / 115)
    return Math.max(2, itemsPerRow * 2) // At least 2 items (2 rows)
  }
}

function loadNextChunk() {
  if (inRow) {
    const maxItems = getMaxItemsForRow()
    data.value = albums.slice(0, maxItems)
  } else {
    if (albums.length > 0) {
      const start = currentPage.value * chunkSize
      const end = start + chunkSize
      const nextChunk = albums.slice(start, end)

      data.value.push(...nextChunk)
      currentPage.value++
    } else {
      data.value = []
      currentPage.value = 0
    }
  }
}

const scrolledToBottom = ref<boolean>(false)

const handleScroll = () => {
  if (window.innerHeight + window.scrollY >= document.body.scrollHeight) {
    scrolledToBottom.value = true
    loadNextChunk()
  } else {
    scrolledToBottom.value = false
  }
}

const handleResize = () => {
  if (inRow) {
    loadNextChunk() // Recalculate items when window is resized
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)
})

watch(
  () => albums,
  () => {
    loadNextChunk()
  },
)
</script>

<style scoped lang="scss">
.app-albums {
  .album {
    &-grid {
      display: grid;
      gap: 60px;
      @include media-down(xl) {
        gap: 30px;
      }

      &.row {
        grid-auto-flow: column;
        grid-auto-columns: 140px;
        overflow: hidden;
        @include media-down(lg) {
          grid-auto-columns: 100px;
        }
        @include media-down(md) {
          gap: 15px;
          grid-auto-flow: initial;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          grid-template-rows: repeat(2, 1fr);
          grid-auto-columns: unset;
        }
      }
      &.cell {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 60px 80px;
        @include media-down(md) {
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 24px 15px;
        }
      }
    }
  }
  .no-albums {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 140px;
    @include media-down(lg) {
      min-height: 100px;
    }
  }
}
</style>
