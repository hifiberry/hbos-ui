import { ref, computed, readonly } from 'vue'
import { coverArtLoader, type CoverArtResult } from '@/services/coverartloader'
import type { Song } from '@/types/player'

/**
 * Create a unique key for a song to enable caching
 * Returns null if either title or artist is missing
 */
function createSongKey(song: Song): string | null {
  const title = song.title?.trim() || ''
  const artist = song.artist?.trim() || ''
  
  // Require both title and artist for a valid key
  if (!title || !artist) {
    return null
  }
  
  const album = song.album?.trim() || ''
  return `${title}|${artist}|${album}`.toLowerCase()
}

/**
 * Vue composable for managing cover art loading
 *
 * Provides reactive state and methods for loading cover art for songs,
 * with automatic fallback from song to artist cover art.
 * Includes intelligent caching to avoid unnecessary API calls.
 */
export function useCoverArt() {
  const loading = ref(false)
  const lastResult = ref<CoverArtResult | null>(null)
  const error = ref<string | null>(null)

  // Cache for cover art results by song key
  const coverArtCache = ref<Map<string, CoverArtResult>>(new Map())
  const lastSongKey = ref<string | null>(null)

  // Computed properties for easy access
  const coverArtUrls = computed(() => lastResult.value?.urls || [])
  const hasCoverArt = computed(() => coverArtUrls.value.length > 0)
  const bestCoverArt = computed(() => coverArtUrls.value[0] || null)
  const coverArtSource = computed(() => lastResult.value?.source || 'none')
  const coverArtProviders = computed(() => lastResult.value?.providers || [])

  /**
   * Load cover art for a song
   * @param song - Song object to find cover art for
   * @returns Promise resolving to the cover art result
   */
  const loadCoverArt = async (song: Song): Promise<CoverArtResult> => {
    if (!song) {
      const emptyResult: CoverArtResult = { success: false, urls: [], source: 'none', providers: [] }
      lastResult.value = emptyResult
      lastSongKey.value = null
      return emptyResult
    }

    // Require both artist and title to be defined
    if (!song.artist || !song.title) {
      console.log('Cannot load cover art - missing required fields:', {
        title: song.title,
        artist: song.artist
      })
      const emptyResult: CoverArtResult = { success: false, urls: [], source: 'none', providers: [] }
      lastResult.value = emptyResult
      lastSongKey.value = null
      return emptyResult
    }

    // Create a unique key for this song
    const songKey = createSongKey(song)
    
    // If we can't create a valid key (missing title/artist), we can't cache or check cache
    if (!songKey) {
      loading.value = true
      error.value = null

      try {
        const result = await coverArtLoader.findCoverArt(song)
        lastResult.value = result
        lastSongKey.value = null
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load cover art'
        error.value = errorMessage
        console.error('Cover art loading error:', err)

        const errorResult: CoverArtResult = { success: false, urls: [], source: 'none', providers: [] }
        lastResult.value = errorResult
        lastSongKey.value = null
        return errorResult
      } finally {
        loading.value = false
      }
    }
    
    // Check if we already have the result for this exact song
    if (lastSongKey.value === songKey && lastResult.value) {
      console.log(`Cover art already loaded for song: ${song.title} by ${song.artist}`)
      return lastResult.value
    }
    
    // Check cache first
    const cachedResult = coverArtCache.value.get(songKey)
    if (cachedResult) {
      console.log(`Using cached cover art for song: ${song.title} by ${song.artist}`)
      lastResult.value = cachedResult
      lastSongKey.value = songKey
      return cachedResult
    }    loading.value = true
    error.value = null

    try {
      const result = await coverArtLoader.findCoverArt(song)

      // Cache the result
      coverArtCache.value.set(songKey, result)
      lastResult.value = result
      lastSongKey.value = songKey

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load cover art'
      error.value = errorMessage
      console.error('Cover art loading error:', err)

      const errorResult: CoverArtResult = { success: false, urls: [], source: 'none', providers: [] }
      lastResult.value = errorResult
      lastSongKey.value = songKey
      return errorResult
    } finally {
      loading.value = false
    }
  }

  /**
   * Get just the best cover art URL for a song
   * @param song - Song object to find cover art for
   * @returns Promise resolving to the best cover art URL or null
   */
  const getBestCoverArt = async (song: Song): Promise<string | null> => {
    const result = await loadCoverArt(song)
    return result.success && result.urls.length > 0 ? result.urls[0] : null
  }

  /**
   * Load cover art for a song by title and artist
   * @param title - Song title
   * @param artist - Artist name
   * @returns Promise resolving to the cover art result
   */
  const loadCoverArtByMetadata = async (title: string, artist: string): Promise<CoverArtResult> => {
    // Validate that both title and artist are provided
    if (!title || !artist) {
      console.log('Cannot load cover art by metadata - missing title or artist:', {
        title,
        artist
      })
      const emptyResult: CoverArtResult = { success: false, urls: [], source: 'none', providers: [] }
      return emptyResult
    }

    const song: Song = {
      title,
      artist,
      duration: 0 // Required by Song interface but not needed for cover art
    }
    return loadCoverArt(song)
  }

  /**
   * Load cover art for a song using only API sources (no existing URLs)
   * Useful as a fallback when existing URLs fail to load
   * @param song - Song object to find cover art for
   * @returns Promise resolving to the cover art result
   */
  const loadCoverArtFromAPI = async (song: Song): Promise<CoverArtResult> => {
    if (!song) {
      const emptyResult: CoverArtResult = { success: false, urls: [], source: 'none', providers: [] }
      lastResult.value = emptyResult
      lastSongKey.value = null
      return emptyResult
    }

    // Require both artist and title to be defined
    if (!song.artist || !song.title) {
      console.log('Cannot load cover art from API - missing required fields:', {
        title: song.title,
        artist: song.artist
      })
      const emptyResult: CoverArtResult = { success: false, urls: [], source: 'none', providers: [] }
      lastResult.value = emptyResult
      lastSongKey.value = null
      return emptyResult
    }

    // Create a unique key for this song with API suffix to distinguish from regular cache
    const baseSongKey = createSongKey(song)
    
    // If we can't create a valid key (missing title/artist), we can't cache
    if (!baseSongKey) {
      loading.value = true
      error.value = null

      try {
        const result = await coverArtLoader.findCoverArtFromAPI(song)
        lastResult.value = result
        lastSongKey.value = null
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load cover art from API'
        error.value = errorMessage
        console.error('Cover art API loading error:', err)

        const errorResult: CoverArtResult = { success: false, urls: [], source: 'none', providers: [] }
        lastResult.value = errorResult
        lastSongKey.value = null
        return errorResult
      } finally {
        loading.value = false
      }
    }
    
    const songKey = baseSongKey + '|api'

    // Check cache first for API results
    const cachedResult = coverArtCache.value.get(songKey)
    if (cachedResult) {
      console.log(`Using cached API cover art for song: ${song.title} by ${song.artist}`)
      lastResult.value = cachedResult
      lastSongKey.value = baseSongKey // Use regular key for lastSongKey
      return cachedResult
    }

    loading.value = true
    error.value = null

    try {
      const result = await coverArtLoader.findCoverArtFromAPI(song)

      // Cache the API result
      coverArtCache.value.set(songKey, result)

      // Also update the regular cache with this result since API results are usually better
      if (result.success) {
        coverArtCache.value.set(baseSongKey, result)
      }

      lastResult.value = result
      lastSongKey.value = baseSongKey
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load cover art from API'
      error.value = errorMessage
      console.error('Cover art API loading error:', err)

      const errorResult: CoverArtResult = { success: false, urls: [], source: 'none', providers: [] }
      lastResult.value = errorResult
      lastSongKey.value = baseSongKey
      return errorResult
    } finally {
      loading.value = false
    }
  }

  /**
   * Check if the cover art API is available
   * @returns Promise resolving to true if API is available
   */
  const checkApiAvailability = async (): Promise<boolean> => {
    try {
      return await coverArtLoader.isApiAvailable()
    } catch (err) {
      console.warn('Failed to check cover art API availability:', err)
      return false
    }
  }

  /**
   * Clear the current cover art state
   */
  const clearCoverArt = () => {
    lastResult.value = null
    lastSongKey.value = null
    error.value = null
    loading.value = false
  }

  /**
   * Clear the cover art cache
   * @param songKey - Optional specific song key to clear, if not provided clears all
   */
  const clearCache = (songKey?: string) => {
    if (songKey) {
      coverArtCache.value.delete(songKey)
    } else {
      coverArtCache.value.clear()
      lastSongKey.value = null
    }
  }

  /**
   * Get cache size for debugging
   */
  const getCacheSize = () => coverArtCache.value.size

  /**
   * Preload cover art for multiple songs
   * @param songs - Array of songs to preload cover art for
   * @returns Promise resolving when all cover art has been loaded
   */
  const preloadCoverArt = async (songs: Song[]): Promise<CoverArtResult[]> => {
    const promises = songs.map(song => coverArtLoader.findCoverArt(song))
    return Promise.all(promises)
  }

  return {
    // State
    loading: readonly(loading),
    coverArtUrls: readonly(coverArtUrls),
    hasCoverArt: readonly(hasCoverArt),
    bestCoverArt: readonly(bestCoverArt),
    coverArtSource: readonly(coverArtSource),
    coverArtProviders: readonly(coverArtProviders),
    error: readonly(error),
    lastResult: readonly(lastResult),

    // Methods
    loadCoverArt,
    loadCoverArtFromAPI,
    getBestCoverArt,
    loadCoverArtByMetadata,
    checkApiAvailability,
    clearCoverArt,
    clearCache,
    getCacheSize,
    preloadCoverArt
  }
}
