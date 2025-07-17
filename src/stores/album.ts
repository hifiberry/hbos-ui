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

import { useConfigStore } from '@/stores/config'

export const useAlbumStore = defineStore('album', () => {
  const configStore = useConfigStore()
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
    return [...albums.value].sort((a, b) => {
      const aDate = a.release_date ? new Date(a.release_date).getTime() : null
      const bDate = b.release_date ? new Date(b.release_date).getTime() : null

      if (aDate && bDate) return bDate - aDate
      if (aDate) return -1
      if (bDate) return 1
      return a.name.localeCompare(b.name)
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
      albums.value = data.value.albums.map((album: Album) => {
        return {
          ...album,
          $id: album.id,
          $title: album.name,
          $subtitle: `${album.artists[0]}`,
          $note: `${album.release_date ? album.release_date.substring(0, 4) : 'Unknown year'}`,
          $cover_src: getAlbumCoverById(album.id),
        }
      })
    }

    loading.value = false
    loaded.value = isFinished.value
  }

  const getAlbumByAlbumId = async (id: string) => {
    album.value = null
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
    albums.value = []

    const { error, data } = await libraryFetch<AlbumByArtistResponse>(
      `/library/:activeLibrary/albums/by-artist-id/${id}`,
    ).json()

    if (error.value) {
      toastStore.showErrorToast(error.value)
    }

    if (data.value?.albums && data.value.albums.length > 0) {
      // albums.value = data.value.albums
      albums.value = data.value.albums.map((album: Album) => {
        return {
          ...album,
          $id: album.id,
          $title: album.name,
          $subtitle: `${album.artists[0]}`,
          $note: `${album.release_date ? album.release_date.substring(0, 4) : 'Unknown year'}`,
          $cover_src: getAlbumCoverById(album.id),
        }
      })
    }

    loading.value = false
  }

  const getAlbumCoverById = (id: string) => {
    const apiBase = configStore.getApiBaseUrl()
    return `${apiBase}/library/${libraryStore.activeLibrary}/image/album:${id}`
  }

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
