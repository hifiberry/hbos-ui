import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useFetch } from '@vueuse/core'
import { useToastStore } from '@/stores/toast'
const toastStore = useToastStore()

import type { Player, PlayerResponse } from '@/types/library'

const API_BASE_URL = `http://localhost:1080/api`

export const useLibraryStore = defineStore('library', () => {
  // State
  const loading = ref<boolean>(false)
  const activeLibrary = ref<string | null>(null)

  // Getters
  const isAvailableLibrary = computed(() => Boolean(activeLibrary.value))

  // Actions
  const getAvailableLibrary = async (): Promise<Player | undefined> => {
    try {
      loading.value = true

      const { error, data } = await useFetch<PlayerResponse>(`${API_BASE_URL}/library`).json()

      if (error.value) {
        toastStore.showErrorToast(error.value)
        throw error.value
      }

      const players = data.value?.players ?? []

      const availableLibrary = players.find((p: Player) => p.has_library && p.is_loaded)
      if (availableLibrary) {
        activeLibrary.value = availableLibrary.player_name
        // return availableLibrary
        return Promise.resolve(availableLibrary)
      }

      const anyLibrary = players.find((p: Player) => p.has_library)
      if (anyLibrary) {
        activeLibrary.value = anyLibrary.player_name
        // return anyLibrary
        return Promise.resolve(anyLibrary)
      }
      throw new Error('No available libraries found')
    } catch (err) {
      toastStore.showErrorToast(err instanceof Error ? err.message : String(err))
      throw err // let the caller decide what to do
    } finally {
      loading.value = false
    }
  }

  return {
    // Store
    loading,
    activeLibrary,

    // Getters
    isAvailableLibrary,

    // Actions
    getAvailableLibrary,
  }
})
