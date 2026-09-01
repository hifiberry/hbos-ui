import { describe, it, expect, vi, beforeEach } from 'vitest'

// coverartloader.ts constructs its singleton at import time, and that reads
// the config store. vi.mock factories are hoisted above top-level consts, so a
// plain `const apiConfig` is still in its temporal dead zone when the factory
// runs. vi.hoisted() lifts the binding with it.
const { apiConfig } = vi.hoisted(() => ({
  apiConfig: {
    deviceIP: '192.168.1.12',
    devicePort: 80,
    apiPrefix: '/api/audiocontrol',
    useProxy: false,
  },
}))

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    apiConfig: () => apiConfig,
    getApiBaseUrl: () => `http://${apiConfig.deviceIP}${apiConfig.apiPrefix}`,
    config: { audiocontrol_api: apiConfig },
  }),
}))

import { createCoverArtLoader } from '@/services/coverartloader'
import type { Song } from '@/types/player'

/**
 * A song's cover_art_url arrives as a device-relative path, and audiocontrol
 * emits it without the /api/audiocontrol prefix over the WebSocket. Bound
 * straight to an <img src> it does not 404 -- it falls through nginx to this
 * app, which answers 200 with index.html, so the browser caches an HTML
 * document as the album cover and nothing reports an error.
 */
describe('CoverArtLoader - device-relative cover art', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    apiConfig.useProxy = false
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('resolves a shortened cover_art_url instead of using it verbatim', async () => {
    const loader = createCoverArtLoader()

    const result = await loader.findCoverArt({
      title: 'a', artist: 'b',
      cover_art_url: '/api/library/mpd/image/dHJhY2s',
    } as Song)

    expect(result.urls).toEqual(['http://192.168.1.12/api/audiocontrol/library/mpd/image/dHJhY2s'])
  })

  it('passes an already-prefixed cover_art_url through to the device', async () => {
    const loader = createCoverArtLoader()

    const result = await loader.findCoverArt({
      title: 'a', artist: 'b',
      cover_art_url: '/api/audiocontrol/library/mpd/image/dHJhY2s',
    } as Song)

    expect(result.urls).toEqual(['http://192.168.1.12/api/audiocontrol/library/mpd/image/dHJhY2s'])
  })

  it('leaves a provider URL alone', async () => {
    const loader = createCoverArtLoader()

    const result = await loader.findCoverArt({
      title: 'a', artist: 'b',
      artwork_url: 'https://fanart.tv/cover.jpg',
    } as Song)

    expect(result.urls).toEqual(['https://fanart.tv/cover.jpg'])
  })
})
