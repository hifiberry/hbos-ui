import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useAppConfigStore } from '@/stores/appconfig'
import { sendPlayerCommand, addTrackToPlayer } from '@/api/player'
import { getConfigValue, setConfigValue } from '@/api/config'

/**
 * An interface that holds the data for a radio station.
 */
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

/**
 * An interface that holds the data for a favorited radio station.
 */
export interface RadioFavorite {
  id: string
  title: string
  url: string
  metadata?: {
    title?: string
    logo_url?: string
    coverart_url?: string // Keep for backward compatibility
    country?: string
    tags?: string
    genre?: string
    language?: string
    bitrate?: number
    codec?: string
    homepage?: string
    [key: string]: string | number | boolean | null | undefined // Allow additional custom metadata
  }
  /* Legacy fields for backward compatibility */
  img?: string
  country?: string
  tags?: string
}

export interface RadioSearchResult {
  found_stations: RadioStation[]
  error?: string
}

export const useRadioStore = defineStore('radio', () => {
  /**
   * Define a `Record` using a `string` as the key and a `RadioFavorite` as the value.
   * It initially stores an empty object.
   */
  const favorites = ref<Record<string, RadioFavorite>>({})

  /** Empty array of `RadioStaiton`s. */
  const searchResults = ref<RadioStation[]>([])
  /** Boolean for loading */
  const loading = ref(false)
  /** Boolean for loaded */
  const loaded = ref(false)
  /** Base url for the api */
  const radioBrowserBaseUrl = ref('https://de1.api.radio-browser.info')

  /**
   * Helper function to parse M3U playlist and extract the actual stream URL.
   * This function uses the `audiocontrol` API as a backend for
   * getting the stream URL.
   *
   * If the parsing fails at any point,
   * the function will jsut return the original `m3uUrl` string.
   * This is done to attemt a direct playback.
   *
   * @param m3uUrl - A string containing the url to the M3U playlist
   * @returns the stream URL.
   */
  const parseM3U = async (m3uUrl: string): Promise<string> => {
    try {
      console.log('Parsing M3U playlist:', m3uUrl)

      const configStore = useAppConfigStore()
      const backendUrl = configStore.getApiBaseUrl()

      /**
       * Get the M3U via the `audiocontrol` API.
       */
      console.log('Using backend M3U parsing API...')
      const response = await fetch(`${backendUrl}/m3u/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: m3uUrl,
          timeout: 30
        })
      })

      if (!response.ok) {
        throw new Error(`Backend M3U API failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('M3U parsing response:', data)

      if (!data.success) {
        throw new Error(`M3U parsing failed: ${data.error}`)
      }

      /**
       * Extract the first URL from the parsed playlist.
       * This will only happen if there is a playlist and
       * the playlist has entries and the entries are not empty.
       */
      if (data.playlist && data.playlist.entries && data.playlist.entries.length > 0) {
        const firstEntry = data.playlist.entries[0]
        const streamUrl = firstEntry.url
        console.log('Extracted stream URL from M3U:', streamUrl)
        return streamUrl
      } else {
        throw new Error('No valid stream URLs found in M3U playlist')
      }

    } catch (error) {
      console.error('Failed to parse M3U playlist:', error)
      console.log('Falling back to original M3U URL for direct playback attempt')
      return m3uUrl
    }
  }

  /** Stores the value of `favorites.value` as an array. */
  const favoritesList = computed(() => Object.values(favorites.value))
  /** Stores the value `true` if the `favoritesList` is not empty. */
  const hasFavorites = computed(() => favoritesList.value.length > 0)

  /**
    * Set the `radioBrowserBaseURL` to a random server,
    * that are returned by [[https://all.api.radio-browser.info/json/servers]] API.
    *
    * If no servers are found, it falls back to [[https://de2.api.radio-browser.info]].
    */
  const setRadioBrowserBaseUrl = async () => {
    try {
      const response = await fetch('https://all.api.radio-browser.info/json/servers')
      const servers = await response.json()

      if (servers && servers.length > 0) {
        const randomServer = servers[Math.floor(Math.random() * servers.length)]
        radioBrowserBaseUrl.value = `https://${randomServer.name}`

        /* Save item in storage */
        localStorage.setItem('radioBrowserBaseUrl', radioBrowserBaseUrl.value)
        console.log('Using Radio-Browser API base URL:', radioBrowserBaseUrl.value)
      }
    } catch (error) {
      console.error('Failed to get Radio-Browser servers:', error)
      radioBrowserBaseUrl.value = 'https://de2.api.radio-browser.info'
    }
  }

  /**
    * This function searches for a new radio station via
    * the [[radio-browser.info]] API.
    * It also limits the output to 50 radio stations.
    *
    * @param query - The search query string
    */
  const search = async (query: string) => {
    /* Return if the query string is empty after being trimmed. */
    if (!query.trim()) return

    loading.value = true
    try {
      /* Encode string into URI so spaces become `%20`. */
      const encodedQuery = encodeURIComponent(query.trim())
      const url = `${radioBrowserBaseUrl.value}/json/stations/byname/${encodedQuery}?hidebroken=true&limit=50`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      /* Writes the servers that are returned from the API into the `searchResults` ref. */
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

  /**
    * Adds a radio station to the favorites of the user.
    *
    * @param station - The {@link RadioStation} that should be added to favourites.
    */
  const addToFavorites = (station: RadioStation) => {
    favorites.value[station.id] = {
      id: station.id,
      title: station.name,
      url: station.url,
      metadata: {
        title: station.name,
        logo_url: station.image,
        country: station.country,
        tags: station.tags,
        genre: station.tags, // Use tags as genre
        language: station.language,
        bitrate: station.bitrate,
        codec: station.codec,
        homepage: station.homepage
      },
      // Legacy fields for backward compatibility
      img: station.image,
      country: station.country,
      tags: station.tags
    }

    /* Update the favorite status of the station inside the `searchResults` */
    const stationIndex = searchResults.value.findIndex(s => s.id === station.id)
    if (stationIndex !== -1) {
      searchResults.value[stationIndex].isFavorite = true
    }

    saveFavoritesToConfig()
  }

  /**
    * Removes a radio staton from the favorites of the user.
    *
    * @param stationId - The {@link RadioStation} that should be removed from the favorites.
    */
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


  /**
    * Toggles the favorite state of a radio station.
    *
    * @param station - The {@link RadioStation} that should be toggled.
    */
  const toggleFavorite = (station: RadioStation) => {
    if (favorites.value[station.id]) {
      removeFromFavorites(station.id)
    } else {
      addToFavorites(station)
    }
  }

  /**
    * Updates the state of an audio station,
    * that is already in the `favorites` record.
    *
    * @param editedStation - The {@link RadioStation} object that was edited.
    */
  const editFavorite = (editedStation: RadioFavorite) => {
    if (favorites.value[editedStation.id]) {
      favorites.value[editedStation.id] = editedStation
      saveFavoritesToConfig()
    }
  }

  /**
   * This is the function that lets a radio be played.
   * It first configures the radio player (the default is mpd),
   * then tries to parse the URL if it is a M3U playlist,
   * sets the player up for listening to audio and
   * finally queues and plays the radio station.
   *
   * @param {RadioStation | RadioFavorite} station - The station that should be played from.
   */
  const playStation = async (station: RadioStation | RadioFavorite) => {
    try {
      const playerStore = usePlayerStore()
      const configStore = useAppConfigStore()

      /* Get the configured radio player. The default is mpd. */
      const radioPlayerName = configStore.radioPlayer()
      const stationName = 'name' in station ? station.name : station.title

      console.log('Playing radio station:', stationName, 'on player:', radioPlayerName)
      console.log('Original station URL:', station.url)

      /* Check if the URL is an M3U playlist and parse it if needed */
      let finalUrl = station.url
      if (station.url.toLowerCase().endsWith('.m3u')) {
        console.log('Detected M3U playlist, parsing to extract stream URL...')
        finalUrl = await parseM3U(station.url)
      }

      console.log('Final stream URL:', finalUrl)

      /* Pause the current player */
      console.log('Pausing current player...')
      await playerStore.sendCommand('pause')
      console.log('Current player paused')

      /* Clear the queue of the radioPlayer */
      console.log('Clearing radio player queue...')
      await sendPlayerCommand(radioPlayerName, 'clear_queue')
      console.log('Radio player queue cleared')

      /* Add the URL of the radio station to the queue of the radioPlayer */
      console.log('Adding station URL to radio player queue...')

      /* Prepare metadata for the radio station */
      const metadata = {
        title: stationName,
        artist: 'name' in station ? (station.country || 'Radio Station') : (station.metadata?.country || station.country || 'Radio Station'),
        album: 'Radio',
        coverart_url: ('metadata' in station && station.metadata?.coverart_url) ||
                     ('img' in station && station.img) ||
                     ('image' in station && station.image) ||
                     undefined,
        genre: ('metadata' in station && station.metadata?.tags) ||
               ('tags' in station && station.tags) ||
               'Radio',
        ...('metadata' in station && station.metadata ? {
          bitrate: station.metadata.bitrate,
          codec: station.metadata.codec,
          language: station.metadata.language,
          homepage: station.metadata.homepage
        } : {})
      }

      /* Use the final URL (parsed from M3U if necessary) with metadata */
      await addTrackToPlayer(radioPlayerName, finalUrl, metadata)
      console.log('Station URL added to radio player queue')

      /* Send play command to the radioPlayer */
      console.log('Starting radio player playback...')
      await sendPlayerCommand(radioPlayerName, 'play')
      console.log('Radio player playback started')

      console.log('Successfully started radio playback')

    } catch (error) {
      console.error('Failed to play radio station:', error)
      throw error
    }
  }

  /**
    * Function to save the favorites to the config API.
    */
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

  /**
    * Function to load the favorites from the config API.
    * While doing so, it will also migrate old saved favorite radio stations
    * to a newer format, ensuring compatibility.
    */
  const loadFavoritesFromConfig = async () => {
    try {
      const response = await getConfigValue('ui.radiostations')
      if (response.status === 'success' && response.data) {
        const loadedFavorites = JSON.parse(response.data.value)

        /* Migrate old favorites to new metadata structure while maintaining backward compatibility */
        for (const favorite of Object.values(loadedFavorites)) {
          const fav = favorite as RadioFavorite

          /* Ensure legacy fields are defined for backward compatibility */
          if (typeof fav.country === 'undefined') {
            fav.country = undefined
          }
          if (typeof fav.tags === 'undefined') {
            fav.tags = undefined
          }

          /* Migrate to new metadata structure if not already present */
          if (!fav.metadata && (fav.img || fav.country || fav.tags)) {
            fav.metadata = {
              title: fav.title,
              coverart_url: fav.img,
              country: fav.country,
              tags: fav.tags
            }
          }

          /* Ensure both metadata and legacy fields are in sync */
          if (fav.metadata) {
            /* Update legacy fields from metadata for backward compatibility */
            if (!fav.img && fav.metadata.coverart_url) {
              fav.img = fav.metadata.coverart_url
            }
            if (!fav.country && fav.metadata.country) {
              fav.country = fav.metadata.country
            }
            if (!fav.tags && fav.metadata.tags) {
              fav.tags = fav.metadata.tags
            }
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

  /**
    * Function to clear the search results.
    */
  const clearSearchResults = () => {
    searchResults.value = []
    loaded.value = false
  }

  /**
    * Initial function of this store.
    * This should be called before using any other function.
    */
  const initialize = async () => {
    /* Initialize configuration store */
    const configStore = useAppConfigStore()
    await configStore.getConfig()

    /* Load favorites from Config API (with localStorage fallback) */
    await loadFavoritesFromConfig()
    await setRadioBrowserBaseUrl()
  }

  return {
    /* States */
    favorites,
    searchResults,
    loading,
    loaded,
    radioBrowserBaseUrl,

    /* Computed */
    favoritesList,
    hasFavorites,

    /* Actions */
    search,
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
