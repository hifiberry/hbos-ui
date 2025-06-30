import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Artist, ArtistMetadata } from '@/types/library'
import { useRouter } from 'vue-router'

import { useToastStore } from '@/stores/toast'
import { useLibraryFetch } from '@/composables/useLibraryFetch.ts'

export const useArtistStore = defineStore('artist', () => {
  const libraryFetch = useLibraryFetch()
  const toastStore = useToastStore()
  const router = useRouter()

  // State
  const loading = ref<boolean>(false)
  const loaded = ref<boolean>(false)
  const artists = ref<Artist[]>([])
  const artistByName = ref<ArtistMetadata | null>(null)

  // Action
  const getArtists = async () => {
    loading.value = true
    loaded.value = false

    const { error, data, isFinished } = await libraryFetch('/library/:activeLibrary/artists').json()

    if (error.value) {
      toastStore.showErrorToast(`Get Artists Error: ${error.value}`)
    }

    if (data.value?.artists && data.value.artists.length > 0) {
      artists.value = data.value.artists
    }

    loading.value = false
    loaded.value = isFinished.value
  }

  const getArtistByName = async (name: string) => {
    loading.value = true
    loaded.value = false

    const { error, data, isFinished } = await libraryFetch(
      `/library/:activeLibrary/artist/by-name/${name}`,
    ).json()

    if (error.value) {
      toastStore.showErrorToast(`Get Artists by Name Error: ${error.value}`)
    }

    if (data.value?.artist) {
      artistByName.value = data.value.artist
      router.push({
        name: 'artist-album',
        params: {
          artistId: data.value.artist.id,
        },
      })
    } else {
      artists.value = []
    }

    loading.value = false
    loaded.value = isFinished.value
  }

  // const getArtistByName = async (name: string) => {
  //   loading.value = true
  //   loaded.value = false
  //   artists.value = []
  //
  //   const { error, data, isFinished } = await libraryFetch(
  //     `/library/:activeLibrary/artist${name ? `/by-name/${name}` : 's'}`,
  //   ).json()
  //
  //   if (error.value) {
  //     toastStore.showErrorToast(`Get Artists by Name Error: ${error.value}`)
  //   }
  //
  //   if (name && data.value?.artist) {
  //     artistByName.value = data.value.artist
  //   } else if (data.value?.artists && data.value.artists.length > 0) {
  //     artists.value = data.value.artists
  //   }
  //
  //   loading.value = false
  //   loaded.value = isFinished.value
  // }

  return {
    // State
    loading,
    loaded,
    artists,
    artistByName,

    // Action
    getArtists,
    getArtistByName,
  }
})
