import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useAppConfigStore } from '@/stores/appconfig'
import { sendPlayerCommand, addTrackToPlayer } from '@/api/player'
import { getConfigValue, setConfigValue } from '@/api/config'

export interface RadioStation {
  id: string
  name: string
  url: string
  image?: string
  homepage?: string
  tags?: string
  country?: string
  countrycode?: string
  codec?: string
  bitrate?: number
  language?: string
  isFavorite?: boolean
}

export interface RadioFavorite {
  id: string
  title: string
  url: string
  img?: string
  country?: string
  tags?: string
}

export interface RadioSearchResult {
  found_stations: RadioStation[]
  error?: string
}

export const useRadioStore = defineStore('radio', () => {
  // State
  const favorites = ref<Record<string, RadioFavorite>>({})
  const searchResults = ref<RadioStation[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const radioBrowserBaseUrl = ref('https://de1.api.radio-browser.info')

  // Helper function to parse M3U playlists and extract the actual stream URL
  const parseM3U = async (m3uUrl: string): Promise<string> => {
    try {
      console.log('Parsing M3U playlist:', m3uUrl)
      const response = await fetch(m3uUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch M3U: ${response.status}`)
      }

      const m3uContent = await response.text()
      console.log('M3U content:', m3uContent)

      // Split into lines and filter out comments, empty lines, and non-HTTP URLs
      const lines = m3uContent.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#') && line.startsWith('http'))

      if (lines.length === 0) {
        throw new Error('No valid stream URLs found in M3U playlist')
      }

      // Return the first valid HTTP URL found
      const streamUrl = lines[0]
      console.log('Extracted stream URL from M3U:', streamUrl)
      return streamUrl
    } catch (error) {
      console.error('Failed to parse M3U playlist:', error)
      // If parsing fails, return the original URL as fallback
      return m3uUrl
    }
  }

  // Computed
  const favoritesList = computed(() => Object.values(favorites.value))
  const hasFavorites = computed(() => favoritesList.value.length > 0)

  // Actions
  const setRadioBrowserBaseUrl = async () => {
    try {
      // Get available Radio-Browser API servers
      const response = await fetch('https://de1.api.radio-browser.info/json/servers')
      const servers = await response.json()

      if (servers && servers.length > 0) {
        // Pick a random server
        const randomServer = servers[Math.floor(Math.random() * servers.length)]
        radioBrowserBaseUrl.value = `https://${randomServer.name}`
        console.log('Using Radio-Browser API base URL:', radioBrowserBaseUrl.value)
      }
    } catch (error) {
      console.error('Failed to get Radio-Browser servers:', error)
      // Fallback to default
      radioBrowserBaseUrl.value = 'https://de1.api.radio-browser.info'
    }
  }

  const searchRadioBrowser = async (query: string) => {
    if (!query.trim()) return

    loading.value = true
    try {
      const encodedQuery = encodeURIComponent(query.trim())
      const url = `${radioBrowserBaseUrl.value}/json/stations/byname/${encodedQuery}?hidebroken=true&limit=50`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      searchResults.value = data.map((station: {
        stationuuid: string;
        name: string;
        url: string;
        favicon?: string;
        homepage?: string;
        tags?: string;
        country?: string;
        countrycode?: string;
        codec?: string;
        bitrate?: number;
        language?: string;
      }) => ({
        id: station.stationuuid,
        name: station.name,
        url: station.url,
        image: station.favicon || '',
        homepage: station.homepage || '',
        tags: station.tags || '',
        country: station.country || '',
        countrycode: station.countrycode || '',
        codec: station.codec || '',
        bitrate: station.bitrate || 0,
        language: station.language || '',
        isFavorite: !!favorites.value[station.stationuuid]
      }))

      loaded.value = true
    } catch (error) {
      console.error('Radio Browser search error:', error)
      searchResults.value = []
    } finally {
      loading.value = false
    }
  }

  const search = async (query: string) => {
    await searchRadioBrowser(query)
  }

  const addToFavorites = (station: RadioStation) => {
    favorites.value[station.id] = {
      id: station.id,
      title: station.name,
      url: station.url,
      img: station.image,
      country: station.country,
      tags: station.tags
    }

    // Update the station in search results
    const stationIndex = searchResults.value.findIndex(s => s.id === station.id)
    if (stationIndex !== -1) {
      searchResults.value[stationIndex].isFavorite = true
    }

    // Save to Config API
    saveFavoritesToConfig()
  }

  const removeFromFavorites = (stationId: string) => {
    delete favorites.value[stationId]

    // Update the station in search results
    const stationIndex = searchResults.value.findIndex(s => s.id === stationId)
    if (stationIndex !== -1) {
      searchResults.value[stationIndex].isFavorite = false
    }

    // Save to Config API
    saveFavoritesToConfig()
  }

  const toggleFavorite = (station: RadioStation) => {
    if (favorites.value[station.id]) {
      removeFromFavorites(station.id)
    } else {
      addToFavorites(station)
    }
  }

  const editFavorite = (editedStation: RadioFavorite) => {
    if (favorites.value[editedStation.id]) {
      favorites.value[editedStation.id] = editedStation
      saveFavoritesToConfig()
    }
  }

  const playStation = async (station: RadioStation | RadioFavorite) => {
    try {
      const playerStore = usePlayerStore()
      const configStore = useAppConfigStore()

      // Get the configured radio player (default: "mpd")
      const radioPlayerName = configStore.radioPlayer()
      const stationName = 'name' in station ? station.name : station.title

      console.log('Playing radio station:', stationName, 'on player:', radioPlayerName)
      console.log('Original station URL:', station.url)

      // Check if the URL is an M3U playlist and parse it if needed
      let finalUrl = station.url
      if (station.url.toLowerCase().endsWith('.m3u')) {
        console.log('Detected M3U playlist, parsing to extract stream URL...')
        finalUrl = await parseM3U(station.url)
      }

      console.log('Final stream URL:', finalUrl)

      // Step 1: Pause the current player
      console.log('Step 1: Pausing current player...')
      await playerStore.sendCommand('pause')
      console.log('Step 1: Current player paused')

      // Step 2: Clear the queue of the radioPlayer
      console.log('Step 2: Clearing radio player queue...')
      await sendPlayerCommand(radioPlayerName, 'clear_queue')
      console.log('Step 2: Radio player queue cleared')

      // Step 3: Add the URL of the radio station to the queue of the radioPlayer
      console.log('Step 3: Adding station URL to radio player queue...')
      // Use the final URL (parsed from M3U if necessary)
      await addTrackToPlayer(radioPlayerName, finalUrl)
      console.log('Step 3: Station URL added to radio player queue')

      // Step 4: Send a "play" command to the radioPlayer
      console.log('Step 4: Starting radio player playback...')
      await sendPlayerCommand(radioPlayerName, 'play')
      console.log('Step 4: Radio player playback started')

      console.log('Successfully started radio playback')

    } catch (error) {
      console.error('Failed to play radio station:', error)
      throw error
    }
  }

  const saveFavoritesToConfig = async () => {
    try {
      const serializedFavorites = JSON.stringify(favorites.value)
      const response = await setConfigValue('ui.radiostations', serializedFavorites)
      if (response.status === 'success') {
        console.log('Radio favorites saved to Config API')
      } else {
        console.error('Failed to save radio favorites to Config API:', response.message)
      }
    } catch (error) {
      console.error('Failed to save radio favorites to Config API:', error)
    }
  }

  const loadFavoritesFromConfig = async () => {
    try {
      const response = await getConfigValue('ui.radiostations')
      if (response.status === 'success' && response.data) {
        const loadedFavorites = JSON.parse(response.data.value)

        // Migrate old favorites that might not have country and tags
        for (const favorite of Object.values(loadedFavorites)) {
          const fav = favorite as RadioFavorite
          if (typeof fav.country === 'undefined') {
            fav.country = undefined
          }
          if (typeof fav.tags === 'undefined') {
            fav.tags = undefined
          }
        }

        favorites.value = loadedFavorites
        console.log('Radio favorites loaded from Config API')
      } else {
        console.log('No radio favorites found in Config API')
        favorites.value = {}
      }
    } catch (error) {
      console.error('Failed to load radio favorites from Config API:', error)
      favorites.value = {}
    }
  }

  const clearSearchResults = () => {
    searchResults.value = []
    loaded.value = false
  }

  // Initialize
  const initialize = async () => {
    // Initialize configuration store
    const configStore = useAppConfigStore()
    await configStore.getConfig()

    // Load favorites from Config API (with localStorage fallback)
    await loadFavoritesFromConfig()
    await setRadioBrowserBaseUrl()
  }

  return {
    // State
    favorites,
    searchResults,
    loading,
    loaded,
    radioBrowserBaseUrl,

    // Computed
    favoritesList,
    hasFavorites,

    // Actions
    search,
    searchRadioBrowser,
    addToFavorites,
    removeFromFavorites,
    editFavorite,
    toggleFavorite,
    playStation,
    clearSearchResults,
    initialize,
    saveFavoritesToConfig,
    loadFavoritesFromConfig,
    parseM3U
  }
})
