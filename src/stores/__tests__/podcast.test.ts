import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { setConfigValue, getConfigValue, sendPlayerCommand, addTrackToPlayer, pause } = vi.hoisted(() => ({
  setConfigValue: vi.fn(),
  getConfigValue: vi.fn(),
  sendPlayerCommand: vi.fn(),
  addTrackToPlayer: vi.fn(),
  pause: vi.fn(),
}))

vi.mock('@/api/config', () => ({ setConfigValue, getConfigValue }))
vi.mock('@/api/player', () => ({ sendPlayerCommand, addTrackToPlayer }))
vi.mock('@/stores/player', () => ({ usePlayerStore: () => ({ sendCommand: pause }) }))
vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({ getConfig: vi.fn(), radioPlayer: () => 'mpd' }),
}))

import { usePodcastStore } from '@/stores/podcast'

const show = {
  wrapperType: 'track',
  collectionId: 42,
  collectionName: 'Hi-Fi Talk',
  artistName: 'Some Host',
  artworkUrl600: 'https://img/600.jpg',
  feedUrl: 'https://feed/rss',
  primaryGenreName: 'Music',
}

const episode = (id: number, date: string, url?: string) => ({
  wrapperType: 'podcastEpisode',
  trackId: id,
  trackName: `Episode ${id}`,
  episodeUrl: url,
  releaseDate: date,
  trackTimeMillis: 1_800_000,
  description: 'About things',
})

const respondWith = (results: unknown[]) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results }) }))
}

describe('podcast store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    setConfigValue.mockResolvedValue({ status: 'success' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('marks search results the user already subscribed to', async () => {
    const store = usePodcastStore()
    store.subscribe({ id: '42', title: 'Hi-Fi Talk', author: '', image: '', feedUrl: '', genre: '' })
    respondWith([show, { ...show, collectionId: 7, collectionName: 'Other' }])

    await store.search('hifi')

    expect(store.searchResults.map((p) => [p.id, p.isSubscribed])).toEqual([
      ['42', true],
      ['7', false],
    ])
  })

  it('returns playable episodes newest first, with durations in seconds', async () => {
    respondWith([
      show,
      episode(1, '2024-01-01T00:00:00Z', 'https://a/1.mp3'),
      episode(2, '2025-01-01T00:00:00Z', 'https://a/2.mp3'),
      episode(3, '2025-06-01T00:00:00Z'), // no audio URL: not playable
    ])

    const { podcast, episodes } = await usePodcastStore().getEpisodes('42')

    expect(podcast?.title).toBe('Hi-Fi Talk')
    expect(episodes.map((e) => e.id)).toEqual(['2', '1'])
    expect(episodes[0].duration).toBe(1800)
  })

  it('persists subscriptions to the config', () => {
    const store = usePodcastStore()
    store.subscribe({ id: '42', title: 'Hi-Fi Talk', author: 'A', image: '', feedUrl: '', genre: '' })

    expect(setConfigValue).toHaveBeenCalledWith('ui.podcasts', expect.stringContaining('"42"'))

    store.unsubscribe('42')
    expect(setConfigValue).toHaveBeenLastCalledWith('ui.podcasts', '{}')
  })

  it('replaces the radio player queue with the episode and plays it', async () => {
    const store = usePodcastStore()
    const podcast = { id: '42', title: 'Hi-Fi Talk', author: 'Some Host', image: 'https://img', feedUrl: '', genre: 'Music' }

    await store.playEpisode(
      { id: '2', title: 'Episode 2', url: 'https://a/2.mp3', description: '', releaseDate: '', duration: 60, image: '' },
      podcast,
    )

    expect(pause).toHaveBeenCalledWith('pause')
    expect(sendPlayerCommand.mock.calls.map((c) => c[1])).toEqual(['clear_queue', 'play'])
    expect(addTrackToPlayer).toHaveBeenCalledWith('mpd', 'https://a/2.mp3', expect.objectContaining({
      title: 'Episode 2',
      artist: 'Some Host',
      album: 'Hi-Fi Talk',
      coverart_url: 'https://img',
    }))
  })
})

describe('podcasts added by feed address', () => {
  const feed = `<?xml version="1.0"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"><channel>
  <title>Feed Show</title><itunes:author>Feed Host</itunes:author>
  <item><title>E1</title><guid>g1</guid><enclosure url="https://a/e1.mp3"/></item>
</channel></rss>`

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    setConfigValue.mockResolvedValue({ status: 'success' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => feed }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('subscribes with the feed address and reads episodes from the feed', async () => {
    const store = usePodcastStore()

    const id = await store.addFeed('  https://example.com/feed.rss ')

    expect(id).toMatch(/^rss-[0-9a-f]{8}$/)
    expect(store.subscriptions[id]).toMatchObject({
      title: 'Feed Show',
      author: 'Feed Host',
      feedUrl: 'https://example.com/feed.rss',
      source: 'rss',
    })

    const { podcast, episodes } = await store.getEpisodes(id)
    expect(podcast?.title).toBe('Feed Show')
    expect(episodes.map((e) => e.url)).toEqual(['https://a/e1.mp3'])
    // The directory is never asked about a feed podcast.
    expect(vi.mocked(fetch).mock.calls.every(([url]) => String(url) === 'https://example.com/feed.rss')).toBe(true)
  })

  it('adding the same feed twice keeps one subscription', async () => {
    const store = usePodcastStore()
    const first = await store.addFeed('https://example.com/feed.rss')
    const second = await store.addFeed('https://example.com/feed.rss')

    expect(second).toBe(first)
    expect(store.subscriptionsList).toHaveLength(1)
  })

  it('does not subscribe when the feed cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '<html></html>' }))
    const store = usePodcastStore()

    await expect(store.addFeed('https://example.com/page')).rejects.toMatchObject({ reason: 'not-a-feed' })
    expect(store.hasSubscriptions).toBe(false)
  })
})
