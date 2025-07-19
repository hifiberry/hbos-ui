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

import { useAppConfigStore } from '@/stores/appconfig'

export const useAlbumStore = defineStore('album', () => {
  const configStore = useAppConfigStore()
  const libraryFetch = useLibraryFetch()
  const toastStore = useToastStore()
  const libraryStore = useLibraryStore()

  // State
  const loading = ref<boolean>(false)
  const loaded = ref<boolean>(false)
  const albums = ref<Album[]>([])
  const allAlbums = ref<Album[]>([]) // Store all albums
  const album = ref<AlbumDetails | null>(null)
  const searchQuery = ref<string>('')
  const sortBy = ref<'release_date' | 'artist'>('release_date')
  const sortOrder = ref<'asc' | 'desc'>('desc')

  // Getter
  const sortedAlbums = computed(() => {
    const sorted = [...albums.value].sort((a, b) => {
      let comparison = 0

      switch (sortBy.value) {
        case 'release_date':
          const aDate = a.release_date ? new Date(a.release_date).getTime() : 0
          const bDate = b.release_date ? new Date(b.release_date).getTime() : 0
          comparison = aDate - bDate
          // Secondary sort by name if dates are equal
          if (comparison === 0) {
            comparison = a.name.localeCompare(b.name)
          }
          break

        case 'artist':
          const aArtist = a.artists[0] || ''
          const bArtist = b.artists[0] || ''
          comparison = aArtist.localeCompare(bArtist)
          // Secondary sort by name if artists are equal
          if (comparison === 0) {
            comparison = a.name.localeCompare(b.name)
          }
          break
      }

      // For artist sorting, always use ascending order
      if (sortBy.value === 'artist') {
        return comparison
      }

      // For release_date sorting, respect the sortOrder
      return sortOrder.value === 'desc' ? -comparison : comparison
    })

    return sorted
  })

  // Keep the old computed property for backward compatibility
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

  // Filter function that updates the albums array directly
  const filterAlbums = (query: string) => {
    if (!query.trim()) {
      // If no query, show all albums
      albums.value = [...allAlbums.value]
    } else {
      // Filter albums by name or artist
      const lowerQuery = query.toLowerCase().trim()
      albums.value = allAlbums.value.filter(album =>
        album.name.toLowerCase().includes(lowerQuery) ||
        album.artists.some(artist => artist.toLowerCase().includes(lowerQuery))
      )
    }
  }  // Action
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
      const mappedAlbums = data.value.albums.map((album: Album) => {
        return {
          ...album,
          $id: album.id,
          $title: album.name,
          $subtitle: `${album.artists[0]}`,
          $note: `${album.release_date ? album.release_date.substring(0, 4) : 'Unknown year'}`,
          $cover_src: getAlbumCoverById(album.id),
        }
      })

      // Store all albums and set the filtered albums
      allAlbums.value = mappedAlbums
      albums.value = mappedAlbums
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

  const setSearchQuery = (query: string) => {
    searchQuery.value = query
    filterAlbums(query)
  }

  const clearSearch = () => {
    searchQuery.value = ''
    filterAlbums('')
  }

  const setSortBy = (newSortBy: 'release_date' | 'artist') => {
    sortBy.value = newSortBy

    // When switching to artist sorting, always set to ascending
    if (newSortBy === 'artist') {
      sortOrder.value = 'asc'
    }
  }

  const setSortOrder = (newSortOrder: 'asc' | 'desc') => {
    sortOrder.value = newSortOrder
  }

  const toggleSortOrder = () => {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  }

  return {
    // State
    loading,
    loaded,
    albums,
    album,
    searchQuery,
    sortBy,
    sortOrder,

    // Getter
    sortedAlbums,
    sortedAlbumsByReleaseDate,

    // Action
    getAlbums,
    getAlbumByArtistId,
    getAlbumByAlbumId,
    getAlbumCoverById,
    setSearchQuery,
    clearSearch,
    filterAlbums,
    setSortBy,
    setSortOrder,
    toggleSortOrder,
  }
})
