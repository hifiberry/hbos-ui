import { describe, it, expect, vi, beforeEach } from 'vitest'

const apiConfig = {
  deviceIP: '192.168.1.12',
  devicePort: 80,
  apiPrefix: '/api/audiocontrol',
  useProxy: false,
}

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    apiConfig: () => apiConfig,
    getApiBaseUrl: () =>
      apiConfig.useProxy
        ? `http://localhost${apiConfig.apiPrefix}`
        : `http://${apiConfig.deviceIP}${apiConfig.apiPrefix}`,
    config: { audiocontrol_api: apiConfig },
  }),
}))

import { rewriteAudiocontrolApiUrl } from '@/api/utils'

describe('rewriteAudiocontrolApiUrl', () => {
  beforeEach(() => {
    apiConfig.useProxy = false
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  /** audiocontrol reports lyrics_url as a shortened /api/lyrics/... path. The
   *  audiocontrol segment must end up in the URL exactly once - the base URL
   *  already carries it, so adding it again produced
   *  /api/audiocontrol/audiocontrol/lyrics/... which the auth gateway 401s. */
  it('does not duplicate the audiocontrol segment for shortened lyrics URLs', () => {
    expect(rewriteAudiocontrolApiUrl('/api/lyrics/mpd/dHJhY2s')).toBe(
      'http://192.168.1.12/api/audiocontrol/lyrics/mpd/dHJhY2s',
    )
  })

  it('does not duplicate the audiocontrol segment for shortened library URLs', () => {
    expect(rewriteAudiocontrolApiUrl('/api/library/mpd/image/dHJhY2s')).toBe(
      'http://192.168.1.12/api/audiocontrol/library/mpd/image/dHJhY2s',
    )
  })

  it('does not duplicate the audiocontrol segment for shortened coverart URLs', () => {
    expect(rewriteAudiocontrolApiUrl('/api/coverart/artist/QXJ0aXN0/image')).toBe(
      'http://192.168.1.12/api/audiocontrol/coverart/artist/QXJ0aXN0/image',
    )
  })

  /** Some endpoints already return the full path. Those must pass through
   *  unchanged apart from getting the host prepended. */
  it('leaves an already fully-prefixed URL alone', () => {
    expect(rewriteAudiocontrolApiUrl('/api/audiocontrol/now-playing')).toBe(
      'http://192.168.1.12/api/audiocontrol/now-playing',
    )
  })

  it('returns the corrected relative path in proxy mode', () => {
    apiConfig.useProxy = true
    expect(rewriteAudiocontrolApiUrl('/api/lyrics/mpd/dHJhY2s')).toBe(
      '/api/audiocontrol/lyrics/mpd/dHJhY2s',
    )
  })

  it('passes through absolute and non-API URLs', () => {
    expect(rewriteAudiocontrolApiUrl('https://example.com/x')).toBe('https://example.com/x')
    expect(rewriteAudiocontrolApiUrl('/images/logo.svg')).toBe('/images/logo.svg')
    expect(rewriteAudiocontrolApiUrl('')).toBe('')
  })
})
