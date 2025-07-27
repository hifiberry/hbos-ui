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
      const emptyResult: CoverArtResult = { success: false, urls: [], images: [], source: 'none', providers: [] }
      lastResult.value = emptyResult
      lastSongKey.value = null
      return emptyResult
    }

    // Create a unique key for this song (only if both artist and title are available)
    const songKey = createSongKey(song)

    // If we have a valid key, check cache first
    if (songKey) {
      // Check if we've already loaded cover art for this exact song
      if (songKey === lastSongKey.value && lastResult.value) {
        console.log('🎯 Using cached cover art result for song:', song.title, 'by', song.artist)
        return lastResult.value
      }

      // Check the cache for this song
      const cachedResult = coverArtCache.value.get(songKey)
      if (cachedResult) {
        console.log('🎯 Using cached cover art for song:', song.title, 'by', song.artist)
        lastResult.value = cachedResult
        lastSongKey.value = songKey
        return cachedResult
      }
    }

    // No cache hit, or no valid key - load fresh cover art
    loading.value = true
    error.value = null

    try {
      console.log('🔍 Loading fresh cover art for song:', song.title, 'by', song.artist)
      const result = await coverArtLoader.findCoverArt(song)
      lastResult.value = result
      lastSongKey.value = songKey // might be null if no artist/title

      // Only cache if we have a valid key
      if (songKey) {
        coverArtCache.value.set(songKey, result)
        console.log('💾 Cached cover art result for song:', song.title, 'by', song.artist)
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error.value = errorMessage
      console.error('Failed to load cover art:', errorMessage)

      const emptyResult: CoverArtResult = { success: false, urls: [], images: [], source: 'none', providers: [] }
      lastResult.value = emptyResult
      lastSongKey.value = null
      return emptyResult
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
      const emptyResult: CoverArtResult = { success: false, urls: [], images: [], source: 'none', providers: [] }
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
      const emptyResult: CoverArtResult = { success: false, urls: [], images: [], source: 'none', providers: [] }
      lastResult.value = emptyResult
      lastSongKey.value = null
      return emptyResult
    }

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

      const errorResult: CoverArtResult = { success: false, urls: [], images: [], source: 'none', providers: [] }
      lastResult.value = errorResult
      lastSongKey.value = null
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
