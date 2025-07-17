import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

import { useFetch } from '@vueuse/core'
import { useToastStore } from '@/stores/toast'

import type { LibraryPlayer, LibraryPlayerResponse } from '@/types/library'

import { useAppConfigStore } from '@/stores/appconfig'

export const useLibraryStore = defineStore('library', () => {
  const configStore = useAppConfigStore()
  const toastStore = useToastStore()

  // State
  const loading = ref<boolean>(false)
  const activeLibrary = ref<string | null>(null)

  // Getters
  const isAvailableLibrary = computed(() => Boolean(activeLibrary.value))

  // Actions
  const getAvailableLibrary = async () => {
    loading.value = true

    const apiBase = configStore.getApiBaseUrl()
    const { error, data } = await useFetch<LibraryPlayerResponse>(`${apiBase}/library`).json()

    if (error.value) {
      toastStore.showErrorToast(`Get Available Library Error: ${error.value}`)
      loading.value = false
      return Promise.reject(error.value)
    }

    const players = data.value?.players ?? []
    console.log('Library players available:', players)

    // Find any player with library that's loaded
    let availableLibrary = players.find((p: LibraryPlayer) =>
      p.has_library && p.is_loaded
    )

    // Last resort: any player with library
    if (!availableLibrary) {
      availableLibrary = players.find((p: LibraryPlayer) => p.has_library)
    }

    if (availableLibrary) {
      console.log('Selected library player:', availableLibrary.player_name)
      activeLibrary.value = availableLibrary.player_name
    } else {
      console.warn('No suitable library player found')
      activeLibrary.value = null
    }

    loading.value = false
    return Promise.resolve(activeLibrary.value)
  }

  const getAlbumCover = (id: string) => {
    const apiBase = configStore.getApiBaseUrl()
    return `${apiBase}/library/${activeLibrary.value}/image/album:${id}`
  }

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
