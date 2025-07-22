import { ref, computed } from 'vue'
import { useLibraryFetch } from '@/composables/useLibraryFetch'

interface FavouriteProviders {
  enabled_providers: string[]
  total_providers: number
  enabled_count: number
}

interface FavouriteCheck {
  Ok?: {
    is_favourite: boolean
    providers: string[]
  }
  Err?: {
    error: string
  }
}

interface FavouriteOperation {
  Ok?: {
    success: boolean
    message: string
    providers: string[]
    updated_providers: string[]
  }
  Err?: {
    error: string
  }
}

interface Song {
  artist: string
  title: string
}

export function useFavourites() {
  const libraryFetch = useLibraryFetch()

  const loading = ref(false)
  const error = ref<string | null>(null)
  const providers = ref<FavouriteProviders | null>(null)

  // Get available favourites providers
  const getProviders = async () => {
    try {
      loading.value = true
      error.value = null

      const { error: fetchError, data } = await libraryFetch('/favourites/providers').json<FavouriteProviders>()

      if (fetchError.value) {
        error.value = 'Failed to fetch providers'
        return null
      }

      providers.value = data.value
      return data.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    } finally {
      loading.value = false
    }
  }

  // Check if a song is favourite
  const isFavourite = async (song: Song): Promise<boolean> => {
    if (!song.artist || !song.title) {
      return false
    }

    try {
      const params = new URLSearchParams({
        artist: song.artist,
        title: song.title
      })

      const { error: fetchError, data } = await libraryFetch(`/favourites/is_favourite?${params}`).json<FavouriteCheck>()

      if (fetchError.value || !data.value) {
        return false
      }

      if (data.value.Ok) {
        return data.value.Ok.is_favourite
      }

      return false
    } catch (err) {
      console.error('Error checking favourite status:', err)
      return false
    }
  }

  // Add song to favourites
  const addToFavourites = async (song: Song): Promise<boolean> => {
    if (!song.artist || !song.title) {
      error.value = 'Artist and title are required'
      return false
    }

    try {
      loading.value = true
      error.value = null

      const { error: fetchError, data } = await libraryFetch('/favourites/add')
        .post({
          artist: song.artist,
          title: song.title
        })
        .json<FavouriteOperation>()

      if (fetchError.value || !data.value) {
        error.value = 'Failed to add to favourites'
        return false
      }

      if (data.value.Ok) {
        return data.value.Ok.success
      } else if (data.value.Err) {
        error.value = data.value.Err.error
        return false
      }

      return false
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return false
    } finally {
      loading.value = false
    }
  }

  // Remove song from favourites
  const removeFromFavourites = async (song: Song): Promise<boolean> => {
    if (!song.artist || !song.title) {
      error.value = 'Artist and title are required'
      return false
    }

    try {
      loading.value = true
      error.value = null

      const { error: fetchError, data } = await libraryFetch('/favourites/remove')
        .delete({
          artist: song.artist,
          title: song.title
        })
        .json<FavouriteOperation>()

      if (fetchError.value || !data.value) {
        error.value = 'Failed to remove from favourites'
        return false
      }

      if (data.value.Ok) {
        return data.value.Ok.success
      } else if (data.value.Err) {
        error.value = data.value.Err.error
        return false
      }

      return false
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return false
    } finally {
      loading.value = false
    }
  }

  // Toggle favourite status
  const toggleFavourite = async (song: Song): Promise<boolean> => {
    const currentStatus = await isFavourite(song)

    if (currentStatus) {
      return await removeFromFavourites(song)
    } else {
      return await addToFavourites(song)
    }
  }

  const hasProviders = computed(() => {
    return providers.value && providers.value.enabled_count > 0
  })

  return {
    loading,
    error,
    providers,
    hasProviders,
    getProviders,
    isFavourite,
    addToFavourites,
    removeFromFavourites,
    toggleFavourite
  }
}
