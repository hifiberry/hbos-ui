import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Album, AlbumByArtistResponse, AlbumDetails, AlbumResponse } from '@/types/library'

import { useLibraryFetch } from '@/composables/useLibraryFetch.ts'
import { useToastStore } from '@/stores/toast'

export const useAlbumStore = defineStore('album', () => {
  const libraryFetch = useLibraryFetch()
  const toastStore = useToastStore()

  // State
  const loading = ref<boolean>(false)
  const albums = ref<Album[]>([])
  const album = ref<AlbumDetails | null>(null)

  // Action
  const getAlbumByAlbumId = async (id: string) => {
    loading.value = true

    const { error, data } = await libraryFetch<AlbumResponse>(
      `/library/:activeLibrary/album/by-id/${id}`,
    ).json()

    if (error.value) {
      toastStore.showErrorToast(error.value)
    }

    if (data.value?.album) {
      album.value = data.value.album
    }

    loading.value = false
  }

  const getAlbumByArtistId = async (id: string) => {
    loading.value = true

    const { error, data } = await libraryFetch<AlbumByArtistResponse>(
      `/library/:activeLibrary/albums/by-artist-id/${id}`,
    ).json()

    if (error.value) {
      toastStore.showErrorToast(error.value)
    }

    if (data.value?.albums && data.value.albums.length > 0) {
      albums.value = data.value.albums
    }

    loading.value = false
  }

  return {
    // State
    loading,
    albums,
    album,

    // Action
    getAlbumByArtistId,
    getAlbumByAlbumId,
  }
})
