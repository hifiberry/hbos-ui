import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Artist } from '@/types/library'

import { useToastStore } from '@/stores/toast'
const toastStore = useToastStore()

import { useLibraryFetch } from '@/composables/useLibraryFetch.ts'
const libraryFetch = useLibraryFetch()

export const useArtistStore = defineStore('artist', () => {
  // State
  const loading = ref<boolean>(false)
  const artists = ref<Artist[]>([])

  // Action
  const getArtists = async () => {
    loading.value = true

    const { error, data } = await libraryFetch(`/library/:activeLibrary/artists`).json()

    if (error.value) {
      toastStore.showErrorToast(error.value)
    }

    if (data.value?.artists && data.value.artists.length > 0) {
      artists.value = data.value.artists
    }

    loading.value = false
  }

  return {
    // State
    loading,
    artists,

    // Action
    getArtists,
  }
})
