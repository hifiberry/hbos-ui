import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useFetch } from '@vueuse/core'

import type { AlbumResponse, Track } from '@/types/library'

import { useLibraryStore } from '@/stores/library.ts'
const libraryStore = useLibraryStore()

import { useToastStore } from '@/stores/toast'
const toastStore = useToastStore()

const API_BASE_URL = `http://localhost:1080/api`

export const usePlayerStore = defineStore('player', () => {
  // Store
  const loading = ref<boolean>(false)

  // Action
  const addTrackToQueue = async (track: Track) => {
    loading.value = true

    if (!libraryStore.isAvailableLibrary) {
      await libraryStore.getAvailableLibrary()
    }

    const trackIdentifier = typeof track === 'object' ? track?.id || track.uri : track

    if (trackIdentifier) {
      const { error } = await useFetch(
        `${API_BASE_URL}/player/${libraryStore.activeLibrary}/command/add_track:${encodeURIComponent(trackIdentifier)}`,
      )
        .post()
        .json()

      if (error.value) {
        toastStore.showErrorToast(error.value)
      }
    } else {
      toastStore.showErrorToast('No valid track identifier available')
    }

    loading.value = false
  }

  return {
    // Action
    addTrackToQueue,
  }
})
