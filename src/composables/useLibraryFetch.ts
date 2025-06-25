import { createFetch } from '@vueuse/core'
import { useLibraryStore } from '@/stores/library.ts'

import { API_BASE_URL } from '@/constants/api.ts'

export const useLibraryFetch = () => {
  const libraryStore = useLibraryStore()
  return createFetch({
    baseUrl: API_BASE_URL,
    combination: 'overwrite',
    options: {
      async beforeFetch({ url, options }) {
        if (!libraryStore.isAvailableLibrary) {
          await libraryStore.getAvailableLibrary()
        }
        url = url.replace(/:activeLibrary(\/|\?|$)/gi, `${libraryStore.activeLibrary}$1`)
        return { options, url }
      },
    },
  })
}
