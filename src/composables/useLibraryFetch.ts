import { createFetch } from '@vueuse/core'
import { useLibraryStore } from '@/stores/library.ts'

import { API_URL } from '@/constants/api.ts'

export const useLibraryFetch = () => {
  const libraryStore = useLibraryStore()
  return createFetch({
    baseUrl: API_URL,
    combination: 'overwrite',
    options: {
      async beforeFetch({ url, options, cancel }) {
        try {
          if (!libraryStore.isAvailableLibrary) {
            await libraryStore.getAvailableLibrary()
          }
        } catch (error) {
          console.error('Active player name failed:', error)
          cancel()
        }
        url = url.replace(/:activeLibrary(\/|\?|$)/gi, `${libraryStore.activeLibrary}$1`)
        return { options, url }
      },
    },
  })
}
