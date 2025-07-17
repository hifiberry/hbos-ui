import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useConfigStore } from '@/stores/config'
import { sendPlayerCommand, addTrackToPlayer } from '@/api/player'

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

    // Save to localStorage
    saveFavorites()
  }

  const removeFromFavorites = (stationId: string) => {
    delete favorites.value[stationId]

    // Update the station in search results
    const stationIndex = searchResults.value.findIndex(s => s.id === stationId)
    if (stationIndex !== -1) {
      searchResults.value[stationIndex].isFavorite = false
    }

    // Save to localStorage
    saveFavorites()
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
      saveFavorites()
    }
  }

  const playStation = async (station: RadioStation | RadioFavorite) => {
    try {
      const playerStore = usePlayerStore()
      const configStore = useConfigStore()

      // Get the configured radio player (default: "mpd")
      const radioPlayerName = configStore.radioPlayer()
      const stationName = 'name' in station ? station.name : station.title

      console.log('Playing radio station:', stationName, 'on player:', radioPlayerName)
      console.log('Station URL:', station.url)

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
      // Use the new addTrackToPlayer function with JSON payload
      await addTrackToPlayer(radioPlayerName, station.url)
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

  const saveFavorites = () => {
    try {
      localStorage.setItem('radioFavorites', JSON.stringify(favorites.value))
    } catch (error) {
      console.error('Failed to save radio favorites:', error)
    }
  }

  const loadFavorites = () => {
    try {
      const saved = localStorage.getItem('radioFavorites')
      if (saved) {
        const loadedFavorites = JSON.parse(saved)

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
      }
    } catch (error) {
      console.error('Failed to load radio favorites:', error)
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
    const configStore = useConfigStore()
    await configStore.getConfig()

    // Load favorites
    loadFavorites()
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
    initialize
  }
})
