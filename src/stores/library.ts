import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useFetch } from '@vueuse/core'
import { useToastStore } from '@/stores/toast'
const toastStore = useToastStore()

import type { Player, PlayerResponse } from '@/types/library'

// const API_BASE_URL = `http://${window.location.hostname}:1080/api`
const API_BASE_URL = `http://localhost:1080/api`

export const useLibraryStore = defineStore('library', () => {
  // State
  const loading = ref<boolean>(false)
  const activeLibrary = ref<string | null>(null)

  // Getters

  // Actions
  const getAvailableLibrary = async (): Promise<Player | undefined> => {
    loading.value = true
    const { error, data } = await useFetch<PlayerResponse>(`${API_BASE_URL}/library`)

    console.log('data', data.value)
    if (error.value) {
      toastStore.showErrorToast(error.value)
      return Promise.reject(error.value)
    }
    const availableLibrary = data.value?.players.find((p) => p.has_library && p.is_loaded)
    if (availableLibrary) {
      activeLibrary.value = availableLibrary.player_name
    } else {
      const anyLibrary = data.value?.players.find((p) => p.has_library)
      if (anyLibrary) {
        activeLibrary.value = anyLibrary.player_name
      }
    }

    return Promise.resolve(availableLibrary)
  }

  return {
    // Store
    loading,
    activeLibrary,

    // Actions
    getAvailableLibrary,
  }
})
