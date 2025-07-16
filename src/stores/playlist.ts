import { ref } from 'vue'
import { defineStore } from 'pinia'

import { useLibraryFetch } from '@/composables/useLibraryFetch.ts'
import { useToastStore } from '@/stores/toast'

import type { Track } from '@/types/library'

interface QueueResponse {
  queue?: Track[]
}

export const usePlaylistStore = defineStore('playlist', () => {
  const libraryFetch = useLibraryFetch()
  const toastStore = useToastStore()

  // State
  const loading = ref<boolean>(false)
  const queue = ref<Track[]>([])

  // Actions
  const fetchQueue = async () => {
    loading.value = true

    try {
      const { error, data } = await libraryFetch<QueueResponse>(`/player/:activeLibrary/queue`)
        .get()
        .json()

      if (error.value) {
        console.error('Error fetching queue:', error.value)
        toastStore.showErrorToast(`Queue fetch error: ${error.value}`)
        queue.value = []
      } else if (data.value?.queue) {
        queue.value = data.value.queue
      } else {
        queue.value = []
      }
    } catch (error) {
      console.error('Error fetching queue:', error)
      toastStore.showErrorToast('Failed to fetch playlist')
      queue.value = []
    }

    loading.value = false
  }

  return {
    // State
    loading,
    queue,

    // Actions
    fetchQueue,
  }
})
