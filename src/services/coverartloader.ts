import { useAppConfigStore } from '@/stores/appconfig'
import type { Song } from '@/types/player'

export interface CoverArtProvider {
  name: string
  display_name: string
}

export interface CoverArtImage {
  url: string
  width?: number
  height?: number
  size_bytes?: number
  format?: string
  grade?: number
}

export interface CoverArtProviderResult {
  provider: CoverArtProvider
  images: CoverArtImage[]
}

export interface CoverArtApiResponse {
  results: CoverArtProviderResult[]
}

export interface CoverArtResult {
  success: boolean
  urls: string[]
  images: CoverArtImage[]
  source: 'song' | 'album' | 'artist' | 'none'
  providers: CoverArtProvider[]
}

/**
 * Cover Art Loader Service
 *
 * Attempts to find cover art for songs using the backend cover art API.
 * Falls back from song-specific to artist-specific cover art.
 */
export class CoverArtLoader {
  private configStore = useAppConfigStore()

  /**
   * URL-safe base64 encode a string without padding
   * @param text - Text to encode
   * @returns URL-safe base64 encoded string
   */
  private encodeBase64UrlSafe(text: string): string {
    // Convert to base64 and make URL-safe
    return btoa(unescape(encodeURIComponent(text)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  /**
   * Fetch cover art URLs from the backend API
   * @param endpoint - API endpoint to call
   * @returns Processed CoverArt API response with filtered images
   */
  private async fetchCoverArt(endpoint: string): Promise<CoverArtApiResponse> {
    try {
      console.log(`Fetching cover art from endpoint: /coverart/${endpoint}`)
      const apiBaseUrl = this.configStore.getApiBaseUrl()
      const response = await fetch(`${apiBaseUrl}/coverart/${endpoint}`)

      if (!response.ok) {
        console.warn(`Cover art API request failed: ${response.status} for ${endpoint}`)
        return { results: [] }
      }

      const rawData = await response.json()
      console.log(`Raw cover art API response for ${endpoint}:`, rawData)

      // Process the response to filter for square images and optimal resolutions
      const processedData = this.processApiResponse(rawData)
      console.log(`Processed cover art API response for ${endpoint}:`, processedData)

      return processedData
    } catch (error) {
      console.warn('Failed to fetch cover art:', error)
      return { results: [] }
    }
  }

  /**
   * Get cover art for a specific song
   * @param title - Song title
   * @param artist - Artist name
   * @returns Cover art API response
   */
  async getSongCoverArt(title: string, artist: string): Promise<CoverArtApiResponse> {
    if (!title || !artist) return { results: [] }

    console.log(`Searching for song cover art: "${title}" by "${artist}"`)
    const titleEncoded = this.encodeBase64UrlSafe(title)
    const artistEncoded = this.encodeBase64UrlSafe(artist)

    return this.fetchCoverArt(`song/${titleEncoded}/${artistEncoded}`)
  }

  /**
   * Get cover art for an artist
   * @param artist - Artist name
   * @returns Cover art API response
   */
  async getArtistCoverArt(artist: string): Promise<CoverArtApiResponse> {
    if (!artist) return { results: [] }

    console.log(`Searching for artist cover art: "${artist}"`)
    const artistEncoded = this.encodeBase64UrlSafe(artist)
    return this.fetchCoverArt(`artist/${artistEncoded}`)
  }

  /**
   * Get cover art for an album
   * @param album - Album title
   * @param artist - Artist name
   * @param year - Optional release year
   * @returns Cover art API response
   */
  async getAlbumCoverArt(album: string, artist: string, year?: number): Promise<CoverArtApiResponse> {
    if (!album || !artist) return { results: [] }

    console.log(`Searching for album cover art: "${album}" by "${artist}"${year ? ` (${year})` : ''}`)
    const albumEncoded = this.encodeBase64UrlSafe(album)
    const artistEncoded = this.encodeBase64UrlSafe(artist)

    const endpoint = year
      ? `album/${albumEncoded}/${artistEncoded}/${year}`
      : `album/${albumEncoded}/${artistEncoded}`

    return this.fetchCoverArt(endpoint)
  }

  /**
   * Get cover art from a URL
   * @param url - Source URL
   * @returns Cover art API response
   */
  async getCoverArtFromUrl(url: string): Promise<CoverArtApiResponse> {
    if (!url) return { results: [] }

    console.log(`Searching for cover art from URL: "${url}"`)
    const urlEncoded = this.encodeBase64UrlSafe(url)
    return this.fetchCoverArt(`url/${urlEncoded}`)
  }

  /**
   * Filter images to only include (almost) square ones
   * @param images - Array of cover art images
   * @returns Filtered array with only square images (aspect ratio between 0.8 and 1.2)
   */
  private filterSquareImages(images: CoverArtImage[]): CoverArtImage[] {
    return images.filter(image => {
      if (!image.width || !image.height) return true // Keep images without dimensions
      const aspectRatio = image.width / image.height
      return aspectRatio >= 0.8 && aspectRatio <= 1.2
    })
  }

  /**
   * Filter images by provider to only keep the largest and those within 80% of largest resolution
   * @param images - Array of cover art images from same provider
   * @returns Filtered array with only high-resolution images
   */
  private filterByResolution(images: CoverArtImage[]): CoverArtImage[] {
    if (images.length <= 1) return images

    // Find the largest resolution (using area as metric)
    let maxArea = 0
    images.forEach(image => {
      if (image.width && image.height) {
        const area = image.width * image.height
        if (area > maxArea) {
          maxArea = area
        }
      }
    })

    // If no images have dimensions, return all
    if (maxArea === 0) return images

    // Keep images that are at least 80% of the largest area
    const minArea = maxArea * 0.8
    return images.filter(image => {
      if (!image.width || !image.height) return true // Keep images without dimensions
      const area = image.width * image.height
      return area >= minArea
    })
  }

  /**
   * Process raw API response to filter and optimize images
   * @param response - Raw cover art API response
   * @returns Processed response with filtered images
   */
  private processApiResponse(response: CoverArtApiResponse): CoverArtApiResponse {
    const processedResults = response.results.map(result => {
      // First filter for square images
      let filteredImages = this.filterSquareImages(result.images)

      // Then filter by resolution within each provider
      filteredImages = this.filterByResolution(filteredImages)

      return {
        ...result,
        images: filteredImages
      }
    }).filter(result => result.images.length > 0) // Remove providers with no images left

    return {
      results: processedResults
    }
  }

  /**
   * Extract all images from API response
   * @param response - Cover art API response
   * @returns Array of all images from all providers
   */
  private extractImages(response: CoverArtApiResponse): CoverArtImage[] {
    const images: CoverArtImage[] = []
    for (const result of response.results) {
      images.push(...result.images)
    }
    return images
  }

  /**
   * Extract all URLs from API response
   * @param response - Cover art API response
   * @returns Array of all URLs from all providers
   */
  private extractUrls(response: CoverArtApiResponse): string[] {
    const urls: string[] = []
    for (const result of response.results) {
      urls.push(...result.images.map(img => img.url))
    }
    return urls
  }

  /**
   * Extract provider information from API response
   * @param response - Cover art API response
   * @returns Array of providers that returned results
   */
  private extractProviders(response: CoverArtApiResponse): CoverArtProvider[] {
    return response.results
      .filter(result => result.images.length > 0)
      .map(result => result.provider)
  }

  /**
   * Check if API response has any results
   * @param response - Cover art API response
   * @returns True if any provider returned images
   */
  private hasResults(response: CoverArtApiResponse): boolean {
    return response.results.some(result => result.images.length > 0)
  }

  /**
   * Main method to find cover art for a song
   * Tries multiple approaches in order of preference:
   * 1. Use existing cover art URLs from song metadata
   * 2. Try to find song-specific cover art
   * 3. Try to find album cover art
   * 4. Fall back to artist cover art
   * 5. Check metadata.coverart_url as last resort
   *
   * @param song - Song object with metadata
   * @returns CoverArtResult with URLs and source information
   */
  async findCoverArt(song: Song): Promise<CoverArtResult> {
    console.log('🔍 Looking for cover art for song:', song.title, 'by', song.artist)

    // First, check if song already has cover art URLs
    const existingUrls = []
    if (song.artwork_url) existingUrls.push(song.artwork_url)
    if (song.cover_art_url) existingUrls.push(song.cover_art_url)

    console.log('🔍 Existing URLs found:', existingUrls)
    console.log('🔍 Song metadata:', song.metadata)

    if (existingUrls.length > 0) {
      console.log('✅ Using existing cover art URLs from song metadata:', existingUrls)
      return {
        success: true,
        urls: existingUrls,
        images: existingUrls.map(url => ({ url })),
        source: 'song',
        providers: [{ name: 'metadata', display_name: 'Song Metadata' }]
      }
    }

    // Try to find cover art from API
    const apiResult = await this.findCoverArtFromAPI(song)

    // If API found results, return them
    if (apiResult.success && apiResult.urls.length > 0) {
      return apiResult
    }

    // Last resort: check for coverart_url or logo_url in the metadata field
    if (song.metadata && typeof song.metadata === 'object') {
      const metadata = song.metadata as Record<string, unknown>

      // Check for coverart_url first, then logo_url
      const metadataCoverUrl = metadata.coverart_url || metadata.logo_url
      const sourceType = metadata.coverart_url ? 'coverart_url' : 'logo_url'

      if (metadataCoverUrl && typeof metadataCoverUrl === 'string') {
        console.log('🎯 Using metadata.' + sourceType + ' as last resort:', metadataCoverUrl)
        return {
          success: true,
          urls: [metadataCoverUrl],
          images: [{ url: metadataCoverUrl }],
          source: 'song',
          providers: [{ name: 'metadata_fallback', display_name: 'Metadata Fallback (' + sourceType + ')' }]
        }
      }
    }

    // No cover art found anywhere
    return apiResult
  }

  /**
   * Find cover art for a song using only API sources (no existing URLs)
   * Useful as a fallback when existing URLs fail to load
   *
   * @param song - Song object with metadata
   * @returns CoverArtResult with URLs and source information
   */
  async findCoverArtFromAPI(song: Song): Promise<CoverArtResult> {
    console.log('Looking for cover art via API for song:', song.title, 'by', song.artist)

    // Try song-specific cover art
    if (song.title && song.artist) {
      const songResponse = await this.getSongCoverArt(song.title, song.artist)
      if (this.hasResults(songResponse)) {
        console.log('Found song cover art from API providers')
        return {
          success: true,
          urls: this.extractUrls(songResponse),
          images: this.extractImages(songResponse),
          source: 'song',
          providers: this.extractProviders(songResponse)
        }
      }
    }

    // Try album cover art
    if (song.album && song.artist) {
      const albumResponse = await this.getAlbumCoverArt(song.album, song.artist)
      if (this.hasResults(albumResponse)) {
        console.log('Found album cover art from API providers')
        return {
          success: true,
          urls: this.extractUrls(albumResponse),
          images: this.extractImages(albumResponse),
          source: 'album',
          providers: this.extractProviders(albumResponse)
        }
      }
    }

    // Fall back to artist cover art
    if (song.artist) {
      const artistResponse = await this.getArtistCoverArt(song.artist)
      if (this.hasResults(artistResponse)) {
        console.log('Found artist cover art from API providers')
        return {
          success: true,
          urls: this.extractUrls(artistResponse),
          images: this.extractImages(artistResponse),
          source: 'artist',
          providers: this.extractProviders(artistResponse)
        }
      }
    }

    // No cover art found via API
    console.log('No cover art found via API for song')
    return {
      success: false,
      urls: [],
      images: [],
      source: 'none',
      providers: []
    }
  }

  /**
   * Get the best cover art URL for a song
   * @param song - Song object with metadata
   * @returns Single cover art URL or null if none found
   */
  async getBestCoverArt(song: Song): Promise<string | null> {
    console.log('Looking for best cover art URL for song:', song.title, 'by', song.artist)
    const result = await this.findCoverArt(song)
    const bestUrl = result.success && result.urls.length > 0 ? result.urls[0] : null
    console.log('Best cover art URL found:', bestUrl)
    return bestUrl
  }

  /**
   * Check if the backend cover art API is available
   * @returns True if the API responds to the methods endpoint
   */
  async isApiAvailable(): Promise<boolean> {
    try {
      console.log('Checking if cover art API is available')
      const apiBaseUrl = this.configStore.getApiBaseUrl()
      const response = await fetch(`${apiBaseUrl}/coverart/methods`)
      const isAvailable = response.ok
      console.log('Cover art API availability:', isAvailable)
      return isAvailable
    } catch (error) {
      console.warn('Cover art API not available:', error)
      return false
    }
  }
}

// Export a singleton instance
export const coverArtLoader = new CoverArtLoader()

// Export factory function for dependency injection or testing
export const createCoverArtLoader = () => new CoverArtLoader()
