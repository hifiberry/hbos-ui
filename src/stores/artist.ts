import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Artist, ArtistResponse } from '@/types/library'
import { useFetch } from '@vueuse/core'

import { useToastStore } from '@/stores/toast'
const toastStore = useToastStore()

import { useLibraryStore } from '@/stores/library.ts'
const libraryStore = useLibraryStore()

const API_BASE_URL = `http://localhost:1080/api`

export const useArtistStore = defineStore('artist', () => {
  // State
  const loading = ref<boolean>(false)
  const artists = ref<Artist[]>([])

  // Action
  const getArtists = async (): Promise<Artist[] | undefined> => {
    try {
      loading.value = true

      if (!libraryStore.isAvailableLibrary) {
        await libraryStore.getAvailableLibrary()
      }

      const { error, data } = await useFetch<ArtistResponse>(
        `${API_BASE_URL}/library/${libraryStore.activeLibrary}/artists`,
      ).json()

      if (error.value) {
        toastStore.showErrorToast(error.value)
        throw error.value
      }

      artists.value = data.value.artists
      // artists.value = []
      return data.value.artists
    } catch (err) {
      toastStore.showErrorToast(err instanceof Error ? err.message : String(err))
      throw err // let the caller decide what to do
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    loading,
    artists,

    // Action
    getArtists,
  }
})
