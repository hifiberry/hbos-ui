import { createFetch } from '@vueuse/core'
import { useLibraryStore } from '@/stores/library.ts'

import { useAppConfigStore } from '@/stores/appconfig'

export const useLibraryFetch = () => {
  const configStore = useAppConfigStore()
  const libraryStore = useLibraryStore()
  return createFetch({
    baseUrl: configStore.getApiBaseUrl(),
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
