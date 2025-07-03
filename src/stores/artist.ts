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

  const page = ref<number>(1)
  const hasMore = ref<boolean>(true)

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
      artists.value = data.value.artists.map((artist: Artist) => {
        return {
          ...artist,
          $id: artist.id,
          $title: artist.name,
          $subtitle: `${artist.album_count} album${artist.album_count !== 1 ? 's' : ''}`,
          $cover_src: artist.thumb_url[0],
        }
      })
    }

    loading.value = false
    loaded.value = isFinished.value
  }

  const getMoreArtists = async () => {
    if (!hasMore.value || loading.value) return

    const { error, data, isFinished } = await libraryFetch(
      `/library/:activeLibrary/artists?page=${page.value}`,
    ).json()

    if (error.value) {
      toastStore.showErrorToast(`Get Artists Error: ${error.value}`)
    }

    if (data.value?.artists.length) {
      artists.value.push(...data.value.artists)
      page.value++
    } else {
      hasMore.value = false
    }

    loading.value = false
    loaded.value = isFinished.value
  }

  const getArtistByName = async (name: string) => {
    loading.value = true
    loaded.value = false

    const { error, data, isFinished } = await libraryFetch(
      `/library/:activeLibrary/artist/by-name/${name.toLowerCase()}`,
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

  return {
    // State
    loading,
    loaded,
    artists,
    artistByName,

    // Action
    getArtists,
    getArtistByName,
    getMoreArtists,
  }
})
