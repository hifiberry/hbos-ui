import { ref, computed, readonly } from 'vue'
import { coverArtLoader, type CoverArtResult } from '@/services/coverartloader'
import type { Song } from '@/types/player'

/**
 * Vue composable for managing cover art loading
 *
 * Provides reactive state and methods for loading cover art for songs,
 * with automatic fallback from song to artist cover art.
 */
export function useCoverArt() {
  const loading = ref(false)
  const lastResult = ref<CoverArtResult | null>(null)
  const error = ref<string | null>(null)

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
      return emptyResult
    }

    loading.value = true
    error.value = null

    try {
      const result = await coverArtLoader.findCoverArt(song)
      lastResult.value = result
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load cover art'
      error.value = errorMessage
      console.error('Cover art loading error:', err)

      const errorResult: CoverArtResult = { success: false, urls: [], source: 'none', providers: [] }
      lastResult.value = errorResult
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
      return emptyResult
    }

    loading.value = true
    error.value = null

    try {
      const result = await coverArtLoader.findCoverArtFromAPI(song)
      lastResult.value = result
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load cover art from API'
      error.value = errorMessage
      console.error('Cover art API loading error:', err)

      const errorResult: CoverArtResult = { success: false, urls: [], source: 'none', providers: [] }
      lastResult.value = errorResult
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
    error.value = null
    loading.value = false
  }

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
    preloadCoverArt
  }
}
