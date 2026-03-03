<template>
  <PageContent :title="category" :backrouterLink="{ name: 'categories' }">
    <div class="card">
      <PosterGrid
        :loading="loading"
        :loaded="loaded"
        :items="albumItems"
        @click="(album) => router.push({ name: 'album', params: { albumId: album.$id }, query: { from: 'categories' } })"
      />
    </div>
  </PageContent>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PageContent from '@/components/PageContent.vue'
import PosterGrid from '@/components/PosterGrid.vue'
import type { PosterItem } from '@/types/library'

import { useLibraryFetch } from '@/composables/useLibraryFetch.ts'
import { useToastStore } from '@/stores/toast'
import { useAlbumStore } from '@/stores/album.ts'

const route = useRoute()
const router = useRouter()
const libraryFetch = useLibraryFetch()
const toastStore = useToastStore()
const albumStore = useAlbumStore()

const category = computed(() => route.params.category as string)

interface Album {
  id: string
  name: string
  artists: string[]
  release_date?: string
}

const albums = ref<Album[]>([])
const loading = ref(false)
const loaded = ref(false)

const albumItems = computed<PosterItem[]>(() =>
  albums.value.map((album) => ({
    $id: album.id,
    $title: album.name,
    $subtitle: album.artists[0] ?? '',
    $note: album.release_date ? album.release_date.substring(0, 4) : '',
    $cover_src: albumStore.getAlbumCoverById(album.id),
  }))
)

const loadAlbums = async () => {
  loading.value = true
  loaded.value = false
  albums.value = []

  const encodedCategory = encodeURIComponent(category.value)
  const { error, data } = await libraryFetch<{ albums: Album[] }>(
    `/library/:activeLibrary/albums/by-category/${encodedCategory}`,
  ).json()

  if (error.value) {
    toastStore.showErrorToast(`Failed to load albums: ${error.value}`)
  } else if (data.value?.albums) {
    albums.value = data.value.albums
  }

  loading.value = false
  loaded.value = true
}

onMounted(loadAlbums)
</script>
