import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Album, AlbumByArtistResponse, AlbumDetails, AlbumResponse } from '@/types/library'
import { useFetch } from '@vueuse/core'

import { useLibraryStore } from '@/stores/library.ts'
const libraryStore = useLibraryStore()

import { useToastStore } from '@/stores/toast'
const toastStore = useToastStore()

const API_BASE_URL = `http://localhost:1080/api`

export const useAlbumStore = defineStore('album', () => {
  // State
  const loading = ref<boolean>(false)
  const albums = ref<Album[]>([])
  const album = ref<AlbumDetails | null>(null)

  // Action
  const getAlbumByAlbumId = async (id: string) => {
    loading.value = true

    if (!libraryStore.isAvailableLibrary) {
      await libraryStore.getAvailableLibrary()
    }

    const { error, data } = await useFetch<AlbumResponse>(
      `${API_BASE_URL}/library/${libraryStore.activeLibrary}/album/by-id/${id}`,
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

    if (!libraryStore.isAvailableLibrary) {
      await libraryStore.getAvailableLibrary()
    }

    const { error, data } = await useFetch<AlbumByArtistResponse>(
      `${API_BASE_URL}/library/${libraryStore.activeLibrary}/albums/by-artist-id/${id}`,
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
