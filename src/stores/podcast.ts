import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { useAppConfigStore } from '@/stores/appconfig'
import { sendPlayerCommand, addTrackToPlayer } from '@/api/player'
import { getConfigValue, setConfigValue } from '@/api/config'
import { fetchFeed } from '@/services/podcastFeed'

/**
 * Podcasts come from the Apple Podcasts directory (iTunes Search API).
 * It needs no key, answers with `Access-Control-Allow-Origin: *` and,
 * unlike a raw RSS feed, can be read straight from the browser. Its lookup
 * endpoint also returns the episodes, so no feed parsing is needed.
 */
const ITUNES_BASE_URL = 'https://itunes.apple.com'

/** Config key the subscriptions are stored under. */
const CONFIG_KEY = 'ui.podcasts'

/** Number of episodes fetched per podcast (the directory caps this at 200). */
const EPISODE_LIMIT = 100

/** Prefix of the ids of podcasts added by their RSS feed address. */
const RSS_ID_PREFIX = 'rss-'

/**
 * Where a podcast comes from: the directory, or an RSS feed the user
 * added by its address.
 */
export type PodcastSource = 'directory' | 'rss'

/**
 * A podcast (show) as found in the directory.
 */
export interface Podcast {
  id: string
  title: string
  author: string
  image: string
  feedUrl: string
  genre: string
  source?: PodcastSource
  isSubscribed?: boolean
}

/**
 * A podcast the user subscribed to, as stored in the config.
 */
export interface PodcastSubscription {
  id: string
  title: string
  author: string
  image: string
  feedUrl: string
  genre: string
  /** Missing on subscriptions stored before feeds could be added; means `directory`. */
  source?: PodcastSource
}

/**
 * A single episode of a podcast.
 */
export interface PodcastEpisode {
  id: string
  title: string
  url: string
  description: string
  releaseDate: string
  /** Duration in seconds, 0 if unknown. */
  duration: number
  image: string
}

/** The fields of an iTunes `podcast` result this store reads. */
interface ITunesPodcast {
  collectionId: number
  collectionName: string
  artistName?: string
  artworkUrl600?: string
  artworkUrl100?: string
  feedUrl?: string
  primaryGenreName?: string
}

/** The fields of an iTunes `podcastEpisode` result this store reads. */
interface ITunesEpisode {
  wrapperType: string
  trackId: number
  trackName: string
  episodeUrl?: string
  description?: string
  shortDescription?: string
  releaseDate?: string
  trackTimeMillis?: number
  artworkUrl600?: string
  artworkUrl160?: string
}

/**
 * Converts an iTunes podcast result into a {@link Podcast}.
 *
 * @param result - The raw result from the directory.
 * @returns The podcast.
 */
const toPodcast = (result: ITunesPodcast): Podcast => ({
  id: String(result.collectionId),
  title: result.collectionName,
  author: result.artistName || '',
  image: result.artworkUrl600 || result.artworkUrl100 || '',
  feedUrl: result.feedUrl || '',
  genre: result.primaryGenreName || '',
})

/**
 * Converts an iTunes episode result into a {@link PodcastEpisode}.
 *
 * @param result - The raw result from the directory.
 * @returns The episode.
 */
const toEpisode = (result: ITunesEpisode): PodcastEpisode => ({
  id: String(result.trackId),
  title: result.trackName,
  url: result.episodeUrl || '',
  description: result.description || result.shortDescription || '',
  releaseDate: result.releaseDate || '',
  duration: result.trackTimeMillis ? Math.round(result.trackTimeMillis / 1000) : 0,
  image: result.artworkUrl600 || result.artworkUrl160 || '',
})

/**
 * Derives a stable id for a feed from its address (FNV-1a, 32 bit), so adding
 * the same feed twice finds the existing subscription.
 *
 * @param feedUrl - The feed address.
 * @returns The podcast id.
 */
export const feedId = (feedUrl: string): string => {
  let hash = 0x811c9dc5
  for (const char of feedUrl.trim()) {
    hash ^= char.codePointAt(0) as number
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return RSS_ID_PREFIX + hash.toString(16).padStart(8, '0')
}

export const usePodcastStore = defineStore('podcast', () => {
  /** Subscribed podcasts, keyed by podcast id. */
  const subscriptions = ref<Record<string, PodcastSubscription>>({})
  /** Results of the last search. */
  const searchResults = ref<Podcast[]>([])
  /** True while a search is running. */
  const loading = ref(false)
  /** True once a search has finished. */
  const loaded = ref(false)

  /** The subscriptions as an array, sorted by title. */
  const subscriptionsList = computed(() =>
    Object.values(subscriptions.value).sort((a, b) => a.title.localeCompare(b.title)),
  )
  /** True if the user subscribed to at least one podcast. */
  const hasSubscriptions = computed(() => subscriptionsList.value.length > 0)

  /**
   * Searches the directory for podcasts.
   *
   * @param query - The search query string.
   */
  const search = async (query: string) => {
    if (!query.trim()) return

    loading.value = true
    try {
      const term = encodeURIComponent(query.trim())
      const response = await fetch(`${ITUNES_BASE_URL}/search?media=podcast&entity=podcast&limit=50&term=${term}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = (await response.json()) as { results?: ITunesPodcast[] }
      searchResults.value = (data.results || []).map((result) => ({
        ...toPodcast(result),
        isSubscribed: !!subscriptions.value[String(result.collectionId)],
      }))
      loaded.value = true
    } catch (error) {
      console.error('podcast: search failed:', error)
      searchResults.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Looks up a single podcast and its newest episodes.
   *
   * @param podcastId - The id of the podcast.
   * @returns The podcast (or `null` if the directory does not know it)
   *          and its episodes, newest first.
   */
  const getEpisodes = async (
    podcastId: string,
  ): Promise<{ podcast: Podcast | null; episodes: PodcastEpisode[] }> => {
    if (podcastId.startsWith(RSS_ID_PREFIX)) {
      return getFeedEpisodes(podcastId)
    }

    const id = encodeURIComponent(podcastId)
    const response = await fetch(
      `${ITUNES_BASE_URL}/lookup?id=${id}&media=podcast&entity=podcastEpisode&limit=${EPISODE_LIMIT}`,
    )
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = (await response.json()) as { results?: (ITunesPodcast & ITunesEpisode)[] }
    const results = data.results || []

    const show = results.find((result) => result.wrapperType === 'track')
    const episodes = results
      .filter((result) => result.wrapperType === 'podcastEpisode' && result.episodeUrl)
      .map(toEpisode)
      .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))

    return { podcast: show ? toPodcast(show) : null, episodes }
  }

  /**
   * Reads the episodes of a podcast that was added by its feed address.
   * The feed address is only known from the subscription.
   *
   * @param podcastId - The id of the podcast.
   * @returns The podcast (`null` if it is not subscribed) and its episodes.
   */
  const getFeedEpisodes = async (
    podcastId: string,
  ): Promise<{ podcast: Podcast | null; episodes: PodcastEpisode[] }> => {
    const subscription = subscriptions.value[podcastId]
    if (!subscription) {
      return { podcast: null, episodes: [] }
    }
    const feed = await fetchFeed(subscription.feedUrl)
    return {
      podcast: {
        ...subscription,
        title: feed.podcast.title || subscription.title,
        author: feed.podcast.author || subscription.author,
        image: feed.podcast.image || subscription.image,
        genre: feed.podcast.genre || subscription.genre,
      },
      episodes: feed.episodes.slice(0, EPISODE_LIMIT),
    }
  }

  /**
   * Subscribes to a podcast by its RSS feed address. The feed is read first,
   * so an address that is no podcast feed is refused.
   *
   * @param feedUrl - The feed address.
   * @returns The id of the podcast.
   * @throws {FeedError} if the feed cannot be fetched or read.
   */
  const addFeed = async (feedUrl: string): Promise<string> => {
    const url = feedUrl.trim()
    const id = feedId(url)
    if (subscriptions.value[id]) return id

    const { podcast } = await fetchFeed(url)
    subscribe({ id, feedUrl: url, source: 'rss', ...podcast })
    return id
  }

  /**
   * Subscribes to a podcast.
   *
   * @param podcast - The podcast to subscribe to.
   */
  const subscribe = (podcast: Podcast | PodcastSubscription) => {
    subscriptions.value[podcast.id] = {
      id: podcast.id,
      title: podcast.title,
      author: podcast.author,
      image: podcast.image,
      feedUrl: podcast.feedUrl,
      genre: podcast.genre,
      source: podcast.source || 'directory',
    }
    setSearchResultSubscribed(podcast.id, true)
    saveSubscriptionsToConfig()
  }

  /**
   * Removes the subscription of a podcast.
   *
   * @param podcastId - The id of the podcast.
   */
  const unsubscribe = (podcastId: string) => {
    delete subscriptions.value[podcastId]
    setSearchResultSubscribed(podcastId, false)
    saveSubscriptionsToConfig()
  }

  /**
   * Toggles the subscription of a podcast.
   *
   * @param podcast - The podcast to toggle.
   */
  const toggleSubscription = (podcast: Podcast | PodcastSubscription) => {
    if (subscriptions.value[podcast.id]) {
      unsubscribe(podcast.id)
    } else {
      subscribe(podcast)
    }
  }

  /**
   * Updates the subscription marker of a podcast inside the search results.
   *
   * @param podcastId - The id of the podcast.
   * @param subscribed - The new state.
   */
  const setSearchResultSubscribed = (podcastId: string, subscribed: boolean) => {
    const result = searchResults.value.find((podcast) => podcast.id === podcastId)
    if (result) {
      result.isSubscribed = subscribed
    }
  }

  /**
   * Plays an episode on the radio player (mpd by default): pauses whatever
   * plays now, replaces the radio player's queue with the episode and starts it.
   *
   * @param episode - The episode to play.
   * @param podcast - The podcast the episode belongs to.
   */
  const playEpisode = async (episode: PodcastEpisode, podcast: Podcast | PodcastSubscription) => {
    const playerStore = usePlayerStore()
    const configStore = useAppConfigStore()
    const playerName = configStore.radioPlayer()

    console.log('podcast: playing episode', episode.title, 'on player', playerName)

    await playerStore.sendCommand('pause')
    await sendPlayerCommand(playerName, 'clear_queue')
    await addTrackToPlayer(playerName, episode.url, {
      title: episode.title,
      artist: podcast.author || podcast.title,
      album: podcast.title,
      coverart_url: episode.image || podcast.image || undefined,
      duration: episode.duration || undefined,
      genre: podcast.genre || 'Podcast',
    })
    await sendPlayerCommand(playerName, 'play')
  }

  /**
   * Saves the subscriptions to the config API.
   */
  const saveSubscriptionsToConfig = async () => {
    try {
      const response = await setConfigValue(CONFIG_KEY, JSON.stringify(subscriptions.value))
      if (response.status !== 'success') {
        console.error('podcast: failed to save subscriptions:', response.message)
      }
    } catch (error) {
      console.error('podcast: failed to save subscriptions:', error)
    }
  }

  /**
   * Loads the subscriptions from the config API.
   */
  const loadSubscriptionsFromConfig = async () => {
    try {
      const response = await getConfigValue(CONFIG_KEY)
      if (response.status === 'success' && response.data) {
        subscriptions.value = JSON.parse(response.data.value) as Record<string, PodcastSubscription>
      } else {
        subscriptions.value = {}
      }
    } catch (error) {
      console.error('podcast: failed to load subscriptions:', error)
      subscriptions.value = {}
    }
  }

  /**
   * Clears the search results.
   */
  const clearSearchResults = () => {
    searchResults.value = []
    loaded.value = false
  }

  /**
   * Initialises the store. Call before using any other function.
   */
  const initialize = async () => {
    const configStore = useAppConfigStore()
    await configStore.getConfig()
    await loadSubscriptionsFromConfig()
  }

  return {
    /* States */
    subscriptions,
    searchResults,
    loading,
    loaded,

    /* Computed */
    subscriptionsList,
    hasSubscriptions,

    /* Actions */
    search,
    getEpisodes,
    addFeed,
    subscribe,
    unsubscribe,
    toggleSubscription,
    playEpisode,
    clearSearchResults,
    initialize,
  }
})
