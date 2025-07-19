<template>
  <div :class="['app-poster-grid']">
    <div :class="['poster-grid', inRow ? 'row' : 'cell']">
      <AppPosterSkeleton v-if="loading" :posterForm="posterForm" :is-note="isNote" />

      <template v-else>
        <AppPoster
          v-for="item in data"
          :key="item.$id"
          :posterForm="posterForm"
          :title="item.$title || ''"
          :subtitle="item.$subtitle || ''"
          :note="item.$note || ''"
          :src="item.$cover_src || ''"
          @click="emit('click', item)"
        />
      </template>
    </div>

    <div v-if="loaded && items.length === 0" class="no-items">No available items found</div>
  </div>
</template>

<script setup lang="ts" generic="T extends PosterItem">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import type { Ref } from 'vue'
import AppPoster from '@/components/app-poster.vue'
import AppPosterSkeleton from '@/components/skeletons/app-poster-skeleton.vue'

import type { PosterItem } from '@/types/library'

interface PosterGridProps<T> {
  loading?: boolean
  loaded?: boolean
  items: T[]
  inRow?: boolean
  posterForm?: 'circle' | 'square'
}

const {
  loading = false,
  loaded = false,
  items = [],
  inRow = false,
  posterForm = 'square',
} = defineProps<PosterGridProps<T>>()

const emit = defineEmits(['click'])

// Dynamic chunk size based on browser window size
const getChunkSize = () => {
  const width = window.innerWidth
  const height = window.innerHeight

  if (width > 3000 && height > 1500) {
    return 100
  } else if (width > 1920 && height > 1080) {
    return 80
  }
  return 50
}

const chunkSize = ref(getChunkSize())
const currentPage = ref<number>(0)
const data = ref<T[]>([]) as Ref<T[]>

const scrolledToBottom = ref<boolean>(false)

// Calculate how many items fit based on screen size
const getMaxItemsForRow = () => {
  if (!inRow) return 20 // For grid view, keep existing behavior

  const width = window.innerWidth

  // Desktop: 1 row, Mobile: 2 rows
  if (width >= 960) {
    // Desktop - calculate items that fit in one row
    // Item width: 140px + gap: 30px = 170px per item (with some padding)
    const availableWidth = width - 100 // Account for padding
    const itemsPerRow = Math.floor(availableWidth / 170)
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
    data.value = items.slice(0, maxItems)
  } else {
    if (items.length > 0) {
      const start = currentPage.value * chunkSize.value
      const end = start + chunkSize.value
      const nextChunk = items.slice(start, end)

      data.value.push(...nextChunk)
      currentPage.value++
    } else {
      data.value = []
      currentPage.value = 0
    }
  }
}

function handleScroll() {
  // Load more content when user is within 1000px (approximately 6 rows) of the bottom
  const scrollBuffer = 1000
  const scrollPosition = window.innerHeight + window.scrollY + scrollBuffer

  if (scrollPosition >= document.body.scrollHeight) {
    scrolledToBottom.value = true
    loadNextChunk()
  } else {
    scrolledToBottom.value = false
  }
}

function handleResize() {
  const newChunkSize = getChunkSize()
  if (newChunkSize !== chunkSize.value) {
    chunkSize.value = newChunkSize
    // Reset and reload with new chunk size
    currentPage.value = 0
    data.value = []
    loadNextChunk()
  }

  // Also recalculate for row mode
  if (inRow) {
    loadNextChunk()
  }
}

const isNote = computed(() => {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if ('$note' in item) {
      return true
    }
  }
  return false
})

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)
})

watch(
  () => items,
  () => {
    // Reset the pagination and reload when items change
    currentPage.value = 0
    data.value = []
    loadNextChunk()
  },
  { immediate: true, deep: true }
)
</script>

<style scoped lang="scss">
.app-poster-grid {
  .poster {
    &-grid {
      display: grid;
      gap: 30px;

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
        @include media-down(md) {
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 24px 15px;
        }
      }
    }
  }
  .no-items {
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
