<template>
  <div class="app-artists">
    <div :class="['artist-grid', inRow ? 'row' : 'cell']">
      <AppPosterSkeleton v-if="loading" poster-form="circle" />

      <template v-else>
        <AppPoster
          v-for="artist in data"
          :key="artist.id"
          :title="artist.name"
          :subtitle="`${artist.album_count} album${artist.album_count !== 1 ? 's' : ''}`"
          :src="artist.thumb_url[0]"
          poster-form="circle"
          @click="router.push({ name: 'artist-album', params: { artistId: artist.id } })"
        />
      </template>
    </div>

    <div v-if="loaded && artists.length === 0" class="no-artists">No available artists found</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

import type { Artist } from '@/types/library'

interface ArtistsProps {
  loading?: boolean
  loaded?: boolean
  artists?: Artist[]
  inRow?: boolean
}

const { loading = false, loaded = false, artists = [], inRow = false } = defineProps<ArtistsProps>()

import { useRouter } from 'vue-router'
const router = useRouter()

import AppPoster from '@/components/app-poster.vue'
import AppPosterSkeleton from '@/components/skeletons/app-poster-skeleton.vue'

const chunkSize = 30
const currentPage = ref(0)
const data = ref<Artist[]>([])

function loadNextChunk() {
  if (inRow) {
    data.value = artists.slice(0, 20)
  } else {
    if (artists.length > 0) {
      const start = currentPage.value * chunkSize
      const end = start + chunkSize
      const nextChunk = artists.slice(start, end)

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
  () => artists,
  () => {
    loadNextChunk()
  },
)
</script>

<style scoped lang="scss">
.app-artists {
  .artist {
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
  .no-artists {
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
