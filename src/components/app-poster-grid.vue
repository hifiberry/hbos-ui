<template>
  <div class="app-poster-grid">
    <div :class="['poster-grid', inRow ? 'row' : 'cell']">
      <AppPosterSkeleton v-if="loading" :posterForm="posterForm" />

      <template v-else>
        <AppPoster
          v-for="item in data"
          :key="item.$id"
          :posterForm="posterForm"
          :title="item.$title || ''"
          :subtitle="item.$subtitle || ''"
          :src="item.$cover_src || ''"
          @click="emit('click', item)"
        />
      </template>
    </div>

    <div v-if="loaded && data.length === 0" class="no-items">No available albums found</div>
  </div>
</template>

<script setup lang="ts" generic="T extends PosterItem">
import { ref, onMounted, onUnmounted, watch } from 'vue'
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
} = defineProps<PosterGridProps<T>>()

const emit = defineEmits(['click'])

const chunkSize = 30
const currentPage = ref<number>(0)
const data = ref<T[]>([]) as Ref<T[]>

const scrolledToBottom = ref<boolean>(false)

function loadNextChunk() {
  if (inRow) {
    data.value = items.slice(0, 10)
  } else {
    if (items.length > 0) {
      const start = currentPage.value * chunkSize
      const end = start + chunkSize
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
  if (window.innerHeight + window.scrollY >= document.body.scrollHeight) {
    scrolledToBottom.value = true
    loadNextChunk()
  } else {
    scrolledToBottom.value = false
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

watch(
  () => items,
  () => {
    loadNextChunk()
  },
)
</script>

<style scoped lang="scss">
.app-poster-grid {
  .poster {
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
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
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
