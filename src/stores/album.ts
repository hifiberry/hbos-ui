import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  Album,
  AlbumByArtistResponse,
  AlbumDetails,
  AlbumResponse,
  AlbumsResponse,
} from '@/types/library'

import { useLibraryFetch } from '@/composables/useLibraryFetch.ts'
import { useToastStore } from '@/stores/toast'
import { useLibraryStore } from '@/stores/library.ts'

import { API_URL } from '@/constants/api.ts'

export const useAlbumStore = defineStore('album', () => {
  const libraryFetch = useLibraryFetch()
  const toastStore = useToastStore()
  const libraryStore = useLibraryStore()

  // State
  const loading = ref<boolean>(false)
  const loaded = ref<boolean>(false)
  const albums = ref<Album[]>([])
  const album = ref<AlbumDetails | null>(null)

  // Getter
  const sortedAlbumsByReleaseDate = computed(() => {
    return albums.value.sort((a: Album, b: Album) => {
      if (a.release_date && b.release_date) {
        // Sort newest first
        return new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
      } else if (a.release_date) {
        // a has date, b doesn't - a is newer
        return -1
      } else if (b.release_date) {
        // b has date, a doesn't - b is newer
        return 1
      } else {
        // Neither has a date, sort by name
        return a.name.localeCompare(b.name)
      }
    })
  })

  // Action
  const getAlbums = async () => {
    loading.value = true
    loaded.value = false

    const { error, data, isFinished } = await libraryFetch<AlbumsResponse>(
      '/library/:activeLibrary/albums',
    ).json()

    if (error.value) {
      toastStore.showErrorToast(`Get Albums Error: ${error.value}`)
    }

    if (data.value?.albums && data.value.albums.length) {
      albums.value = data.value.albums
    }

    loading.value = false
    loaded.value = isFinished.value
  }

  const getAlbumByAlbumId = async (id: string) => {
    loading.value = true

    const { error, data } = await libraryFetch<AlbumResponse>(
      `/library/:activeLibrary/album/by-id/${id}`,
    ).json()

    if (error.value) {
      toastStore.showErrorToast(error.value)
    }

    if (data.value?.album) {
      album.value = data.value.album
    }

    loading.value = false
  }

  const getAlbumByArtistId = async (id: string) => {
    loading.value = true

    const { error, data } = await libraryFetch<AlbumByArtistResponse>(
      `/library/:activeLibrary/albums/by-artist-id/${id}`,
    ).json()

    if (error.value) {
      toastStore.showErrorToast(error.value)
    }

    if (data.value?.albums && data.value.albums.length > 0) {
      albums.value = data.value.albums
    }

    loading.value = false
  }

  const getAlbumCoverById = (id: string) =>
    `${API_URL}/library/${libraryStore.activeLibrary}/image/album:${id}`

  return {
    // State
    loading,
    loaded,
    albums,
    album,

    // Getter
    sortedAlbumsByReleaseDate,

    // Action
    getAlbums,
    getAlbumByArtistId,
    getAlbumByAlbumId,
    getAlbumCoverById,
  }
})
