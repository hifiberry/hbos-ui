import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

import { useFetch } from '@vueuse/core'
import { useToastStore } from '@/stores/toast'

import type { LibraryPlayer, LibraryPlayerResponse } from '@/types/library'

import { useAppConfigStore } from '@/stores/appconfig'
import { getAllLibraryStats, type LibraryStatsResponse } from '@/api/audiocontrol-library'

export const useLibraryStore = defineStore('library', () => {
  const configStore = useAppConfigStore()
  const toastStore = useToastStore()

  // State
  const loading = ref<boolean>(false)
  const activeLibrary = ref<string | null>(null)
  const libraryStats = ref<LibraryStatsResponse[]>([])
  const libraryStatsLoading = ref<boolean>(false)
  const libraryStatsError = ref<string>('')

  // Getters
  const isAvailableLibrary = computed(() => Boolean(activeLibrary.value))
  const isLibraryUpdating = computed(() => !isLibraryLoaded.value && Boolean(activeLibrary.value))

  // State for library loading status
  const isLibraryLoaded = ref<boolean>(false)
  const supportsDelete = ref<boolean>(false)

  // Actions
  const getAvailableLibrary = async () => {
    loading.value = true

    const apiBase = configStore.getApiBaseUrl()
    const { error, data } = await useFetch<LibraryPlayerResponse>(`${apiBase}/library`).json()

    if (error.value) {
      toastStore.showErrorToast("Could not fetch library.")
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
      isLibraryLoaded.value = availableLibrary.is_loaded
      supportsDelete.value = availableLibrary.supports_delete ?? false
    } else {
      console.warn('No suitable library player found')
      activeLibrary.value = null
      isLibraryLoaded.value = false
      supportsDelete.value = false
    }

    loading.value = false
    return Promise.resolve(activeLibrary.value)
  }

  // Method to refresh library status (useful for checking if library update has completed)
  const refreshLibraryStatus = async () => {
    if (!activeLibrary.value) {
      return
    }

    const apiBase = configStore.getApiBaseUrl()
    const { error, data } = await useFetch<LibraryPlayerResponse>(`${apiBase}/library`).json()

    if (!error.value && data.value?.players) {
      const currentPlayer = data.value.players.find((p: LibraryPlayer) => p.player_name === activeLibrary.value)
      if (currentPlayer) {
        isLibraryLoaded.value = currentPlayer.is_loaded
        console.log(`Library ${activeLibrary.value} loaded status: ${isLibraryLoaded.value}`)
      }
    }
  }

  const fetchLibraryStats = async () => {
    libraryStatsLoading.value = true
    libraryStatsError.value = ''
    try {
      libraryStats.value = await getAllLibraryStats()
    } catch (err) {
      libraryStatsError.value = err instanceof Error ? err.message : 'Failed to retrieve library statistics'
    } finally {
      libraryStatsLoading.value = false
    }
  }

  const getAlbumCover = (id: string) => {
    const apiBase = configStore.getApiBaseUrl()
    return `${apiBase}/library/${activeLibrary.value}/image/album:${id}`
  }

  return {
    // Store
    loading,
    activeLibrary,
    isLibraryLoaded,
    supportsDelete,
    libraryStats,
    libraryStatsLoading,
    libraryStatsError,

    // Getters
    isAvailableLibrary,
    isLibraryUpdating,

    // Actions
    getAvailableLibrary,
    refreshLibraryStatus,
    fetchLibraryStats,
    getAlbumCover,
  }
})
