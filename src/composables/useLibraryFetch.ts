import { createFetch } from '@vueuse/core'
import { useLibraryStore } from '@/stores/library.ts'
const libraryStore = useLibraryStore()

import { useToastStore } from '@/stores/toast'
const toastStore = useToastStore()

const API_BASE_URL = `http://localhost:1080/api`

export const useLibraryFetch = createFetch({
  baseUrl: API_BASE_URL,
  options: {
    async beforeFetch({ options }) {
      if (!libraryStore.isAvailableLibrary) {
        await libraryStore.getAvailableLibrary()
      }
      return { options }
    },
  },
})

// export function useLibraryFetch<T>(url: string, options?: RequestInit) {
//   const data = ref<T | null>(null)
//   const error = ref<string | null>(null)
//   const loading = ref(false)
//
//   const useLibraryFetch = createFetch({
//     baseUrl: 'https://my-api.com',
//     options: {
//       async beforeFetch({ options }) {
//         if (!libraryStore.isAvailableLibrary) {
//           await libraryStore.getAvailableLibrary()
//         }
//         return { options }
//       },
//     },
//   })
//
//   return {
//     data,
//     error,
//     loading,
//     useLibraryFetch,
//   }
// }
