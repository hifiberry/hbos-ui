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

function loadNextChunk() {
  if (inRow) {
    data.value = albums.slice(0, 20)
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

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
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
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
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
