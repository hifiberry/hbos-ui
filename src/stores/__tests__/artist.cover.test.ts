import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const { libraryFetch, getCapabilities } = vi.hoisted(() => ({
  libraryFetch: vi.fn(),
  getCapabilities: vi.fn(),
}))

vi.mock('@/composables/useLibraryFetch.ts', () => ({ useLibraryFetch: () => libraryFetch }))
vi.mock('@/api/capabilities', () => ({ getCapabilities }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    getApiBaseUrl: () => 'http://device/api/audiocontrol',
    apiConfig: () => ({ useProxy: false, apiPrefix: '/api/audiocontrol' }),
    config: { audiocontrol_api: { deviceIP: 'device', devicePort: 80 } },
  }),
}))
vi.mock('@/stores/library', () => ({
  useLibraryStore: () => ({ activeLibrary: 'mpd', refreshLibraryStatus: vi.fn() }),
}))

import { useArtistStore } from '@/stores/artist'

const respondWith = (artists: unknown[]) => {
  libraryFetch.mockReturnValue({
    json: () => ({ error: ref(null), data: ref({ artists }), isFinished: ref(true) }),
  })
}

const artist = {
  id: '7',
  name: 'Miles Davis',
  album_count: 4,
  thumb_url: ['/api/coverart/artist/TWlsZXMgRGF2aXM/image'],
}

describe('artist cover URLs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    libraryFetch.mockReset()
    getCapabilities.mockReset()
    getCapabilities.mockResolvedValue({ version: '0.12.0', images: { sizes: [100, 140, 200, 280, 400, 800] } })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true })
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true })
  })

  it('asks for a grid-sized variant in the artist grid', async () => {
    respondWith([artist])
    const store = useArtistStore()

    await store.getArtists()

    expect(store.artists[0].$cover_src).toBe(
      'http://device/api/audiocontrol/coverart/artist/TWlsZXMgRGF2aXM/image?size=280',
    )
  })

  it('asks for the original when the daemon does not resize', async () => {
    getCapabilities.mockResolvedValue(null)
    respondWith([artist])
    const store = useArtistStore()

    await store.getArtists()

    expect(store.artists[0].$cover_src).toBe(
      'http://device/api/audiocontrol/coverart/artist/TWlsZXMgRGF2aXM/image',
    )
  })

  /** acr leaves thumb_url alone when a provider filled it in first, and
   *  theaudiodb.com has no idea what ?size= means. */
  it('leaves a provider image URL unsized', async () => {
    respondWith([{ ...artist, thumb_url: ['https://www.theaudiodb.com/images/media/artist.jpg'] }])
    const store = useArtistStore()

    await store.getArtists()

    expect(store.artists[0].$cover_src).toBe('https://www.theaudiodb.com/images/media/artist.jpg')
  })
})
