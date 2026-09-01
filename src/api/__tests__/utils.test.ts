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
    // Several cases below repair a shortened path, which now warns. They do
    // not assert on it, so stub it rather than printing it.
    vi.spyOn(console, 'warn').mockImplementation(() => {})
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

/**
 * hifiberry/acr#30 makes audiocontrol emit every path under the externally
 * visible prefix, over REST and the WebSocket alike, which makes the repair
 * dead code against a current daemon. It is kept for one release rather than
 * deleted on trust, and warns so the field says whether it is still needed.
 *
 * The warning de-duplicates per session, so each case needs a module whose
 * "already announced" set is empty. A reset hook exported for the tests would
 * be production code that exists only to serve them; re-importing is not.
 */
describe('repair deprecation warning', () => {
  const freshUtils = async () => {
    vi.resetModules()
    return import('@/api/utils')
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    apiConfig.useProxy = false
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('warns when it has to repair a shortened path', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rewriteAudiocontrolApiUrl: rewrite } = await freshUtils()

    rewrite('/api/lyrics/mpd/dHJhY2s')

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('/api/lyrics/mpd/dHJhY2s')
    expect(warn.mock.calls[0][0]).toMatch(/deprecated/i)
  })

  it('stays quiet for a path that already carries the prefix', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rewriteAudiocontrolApiUrl: rewrite } = await freshUtils()

    rewrite('/api/audiocontrol/now-playing')

    expect(warn).not.toHaveBeenCalled()
  })

  /**
   * The artist store rewrites one URL per artist and the album grid one per
   * cell, so against an old daemon an unguarded warning is thousands of
   * identical lines per library scroll -- which buries the real ones and is
   * no better as evidence than a single line.
   */
  it('warns once however many paths share the repaired prefix', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rewriteImageUrl: rewrite } = await freshUtils()

    for (let i = 0; i < 50; i++) {
      rewrite(`/api/library/mpd/image/album${i}`)
    }

    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('warns once for each distinct repaired prefix', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rewriteAudiocontrolApiUrl: rewrite } = await freshUtils()

    rewrite('/api/lyrics/mpd/dHJhY2s')
    rewrite('/api/library/mpd/image/dHJhY2s')
    rewrite('/api/coverart/artist/QXJ0aXN0/image')
    rewrite('/api/lyrics/mpd/b3RoZXI')

    expect(warn).toHaveBeenCalledTimes(3)
  })

  it('counts a repair the same whichever helper made it', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rewriteImageUrl, rewriteAudiocontrolApiUrl: rewrite } = await freshUtils()

    rewriteImageUrl('/api/coverart/artist/QXJ0aXN0/image')
    rewrite('/api/coverart/artist/QXJ0aXN0/image')

    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('still repairs the path it warned about', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rewriteImageUrl } = await freshUtils()

    expect(rewriteImageUrl('/api/library/mpd/image/a')).toBe(
      'http://192.168.1.12/api/audiocontrol/library/mpd/image/a',
    )
    // ...including every one after the warning was suppressed.
    expect(rewriteImageUrl('/api/library/mpd/image/b')).toBe(
      'http://192.168.1.12/api/audiocontrol/library/mpd/image/b',
    )
  })
})
