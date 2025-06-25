import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

import { useFetch } from '@vueuse/core'
import { useToastStore } from '@/stores/toast'

import type { LibraryPlayer, LibraryPlayerResponse } from '@/types/library'

const API_BASE_URL = `http://localhost:1080/api`

export const useLibraryStore = defineStore('library', () => {
  const toastStore = useToastStore()

  // State
  const loading = ref<boolean>(false)
  const activeLibrary = ref<string | null>(null)

  // Getters
  const isAvailableLibrary = computed(() => Boolean(activeLibrary.value))

  // Actions
  const getAvailableLibrary = async () => {
    loading.value = true

    const { error, data } = await useFetch<LibraryPlayerResponse>(`${API_BASE_URL}/library`).json()

    if (error.value) {
      toastStore.showErrorToast(error.value)
    }

    const players = data.value?.players ?? []

    const availableLibrary = players.find((p: LibraryPlayer) => p.has_library && p.is_loaded)
    if (availableLibrary) {
      activeLibrary.value = availableLibrary.player_name
    } else {
      const anyLibrary = players.find((p: LibraryPlayer) => p.has_library)
      if (anyLibrary) {
        activeLibrary.value = anyLibrary.player_name
      }
    }

    loading.value = false
  }

  const getAlbumCover = (id: string) =>
    `${API_BASE_URL}/library/${activeLibrary.value}/image/album:${id}`

  return {
    // Store
    loading,
    activeLibrary,

    // Getters
    isAvailableLibrary,

    // Actions
    getAvailableLibrary,
    getAlbumCover,
  }
})
