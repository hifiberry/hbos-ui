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

import { rewriteAudiocontrolApiUrl, rewriteImageUrl } from '@/api/utils'

describe('rewriteAudiocontrolApiUrl', () => {
  beforeEach(() => {
    // Without this the console spies are shared across cases and their call
    // counts accumulate, so a "must not warn" assertion sees the previous
    // test's warning.
    vi.restoreAllMocks()
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

  /**
   * hifiberry/acr#30 makes audiocontrol emit every path under the externally
   * visible prefix, over REST and the WebSocket alike, which makes the repair
   * below dead code. It is kept for one release rather than deleted on trust:
   * the warning is what will say whether any fielded daemon still needs it.
   */
  it('warns when it has to repair a shortened path', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    rewriteAudiocontrolApiUrl('/api/lyrics/mpd/dHJhY2s')

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('/api/lyrics/mpd/dHJhY2s')
    expect(warn.mock.calls[0][0]).toMatch(/deprecated/i)
  })

  it('stays quiet for a path that already carries the prefix', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    rewriteAudiocontrolApiUrl('/api/audiocontrol/now-playing')

    expect(warn).not.toHaveBeenCalled()
  })
})

describe('rewriteImageUrl', () => {
  beforeEach(() => {
    // Without this the console spies are shared across cases and their call
    // counts accumulate, so a "must not warn" assertion sees the previous
    // test's warning.
    vi.restoreAllMocks()
    apiConfig.useProxy = false
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('warns when it has to repair a shortened image path', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    rewriteImageUrl('/api/coverart/artist/QXJ0aXN0/image')

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('/api/coverart/artist/QXJ0aXN0/image')
  })

  it('stays quiet for an image path that already carries the prefix', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(rewriteImageUrl('/api/audiocontrol/coverart/artist/QXJ0aXN0/image')).toBe(
      'http://192.168.1.12/api/audiocontrol/coverart/artist/QXJ0aXN0/image',
    )
    expect(warn).not.toHaveBeenCalled()
  })
})
