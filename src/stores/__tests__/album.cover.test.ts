import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const { libraryFetch, getCapabilities } = vi.hoisted(() => ({
  libraryFetch: vi.fn(),
  getCapabilities: vi.fn(),
}))

vi.mock('@/composables/useLibraryFetch.ts', () => ({ useLibraryFetch: () => libraryFetch }))
vi.mock('@/api/capabilities', () => ({ getCapabilities }))
vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({ getApiBaseUrl: () => 'http://device/api/audiocontrol' }),
}))
vi.mock('@/stores/library.ts', () => ({
  useLibraryStore: () => ({ activeLibrary: 'mpd', refreshLibraryStatus: vi.fn() }),
}))

import { useAlbumStore } from '@/stores/album'

const respondWith = (albums: unknown[]) => {
  libraryFetch.mockReturnValue({
    json: () => ({ error: ref(null), data: ref({ albums }), isFinished: ref(true) }),
  })
}

const album = { id: '12', name: 'Kind of Blue', artists: ['Miles Davis'], release_date: '1959-08-17' }

describe('album cover URLs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    libraryFetch.mockReset()
    getCapabilities.mockReset()
    getCapabilities.mockResolvedValue({ version: '0.12.0', images: { sizes: [100, 140, 200, 280, 400, 800] } })
    Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true })
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true })
  })

  /** 50-100 of these render at once in a 140px cell. Fetching the original for
   *  each is the whole problem this asks acr to solve. */
  it('asks for a grid-sized variant in the album grid', async () => {
    respondWith([album])
    const store = useAlbumStore()

    await store.getAlbums()

    expect(store.albums[0].$cover_src).toBe(
      'http://device/api/audiocontrol/library/mpd/image/album:12?size=280',
    )
  })

  it('asks for a grid-sized variant in an artist\'s album list', async () => {
    respondWith([album])
    const store = useAlbumStore()

    await store.getAlbumByArtistId('7')

    expect(store.albums[0].$cover_src).toBe(
      'http://device/api/audiocontrol/library/mpd/image/album:12?size=280',
    )
  })

  /** The detail page draws the cover at 400px and there is one of it, so it
   *  keeps the original rather than splitting the cache for no gain. */
  it('leaves the detail-page cover unsized', () => {
    const store = useAlbumStore()

    expect(store.getAlbumCoverById('12')).toBe(
      'http://device/api/audiocontrol/library/mpd/image/album:12',
    )
  })

  it('asks for the original when the daemon does not resize', async () => {
    getCapabilities.mockResolvedValue(null)
    respondWith([album])
    const store = useAlbumStore()

    await store.getAlbums()

    expect(store.albums[0].$cover_src).toBe(
      'http://device/api/audiocontrol/library/mpd/image/album:12',
    )
  })
})
