import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { CoverArtResult } from '@/services/coverartloader'
import type { Song } from '@/types/player'

const BROKEN_URL = '/api/audiocontrol/library/mpd/image/aHR0cHM6Ly9leGFtcGxl'
const FALLBACK_URL = 'https://www.byte.fm/static/favicon/favicon-96x96.png'

const emptyResult = (): CoverArtResult => ({
  success: false,
  urls: [],
  images: [],
  source: 'none',
  providers: [],
})

const songResult = (url: string): CoverArtResult => ({
  success: true,
  urls: [url],
  images: [{ url }],
  source: 'song',
  providers: [{ name: 'metadata', display_name: 'Song Metadata' }],
})

const findCoverArt = vi.fn()
const findCoverArtFromAPI = vi.fn()

vi.mock('@/services/coverartloader', () => ({
  coverArtLoader: {
    findCoverArt: (...args: unknown[]) => findCoverArt(...args),
    findCoverArtFromAPI: (...args: unknown[]) => findCoverArtFromAPI(...args),
  },
}))

import CoverArt from '@/components/CoverArt.vue'

const radioSong = (): Song => ({
  title: 'Can’t Hold Us',
  artist: 'Sampa The Great, Mwanjé',
  duration: 0,
  cover_art_url: BROKEN_URL,
  metadata: { coverart_url: FALLBACK_URL },
} as unknown as Song)

/** Fire the img's error handler the way the browser does when a src 404s. */
const failCurrentImage = async (wrapper: ReturnType<typeof mount>) => {
  const img = wrapper.find('img')
  if (!img.exists()) return null
  const src = img.attributes('src')
  await img.trigger('error')
  await flushPromises()
  return src
}

describe('CoverArt fallback handling', () => {
  beforeEach(() => {
    findCoverArt.mockReset()
    findCoverArtFromAPI.mockReset()
    // The song carries a cover_art_url, so the loader returns it as-is.
    findCoverArt.mockResolvedValue(songResult(BROKEN_URL))
    // Nothing to be found via the online providers.
    findCoverArtFromAPI.mockResolvedValue(emptyResult())
  })

  it('moves on to the metadata fallback when the song cover art 404s', async () => {
    const wrapper = mount(CoverArt, { props: { song: radioSong() } })
    await flushPromises()

    expect(wrapper.find('img').attributes('src')).toBe(BROKEN_URL)

    await failCurrentImage(wrapper)

    expect(wrapper.find('img').attributes('src')).toBe(FALLBACK_URL)
  })

  it('stops retrying once every candidate has failed', async () => {
    const wrapper = mount(CoverArt, { props: { song: radioSong() } })
    await flushPromises()

    const seen: (string | null)[] = []
    for (let i = 0; i < 6; i++) {
      seen.push(await failCurrentImage(wrapper))
    }

    // No URL is ever retried, and the component settles on the placeholder.
    const attempted = seen.filter(Boolean)
    expect(new Set(attempted).size).toBe(attempted.length)
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('.no-cover').exists()).toBe(true)
    // The provider lookup is not repeated in a loop.
    expect(findCoverArtFromAPI.mock.calls.length).toBeLessThanOrEqual(1)
  })

  it('re-arms the fallback chain when the song changes', async () => {
    const wrapper = mount(CoverArt, { props: { song: radioSong() } })
    await flushPromises()
    await failCurrentImage(wrapper)
    await failCurrentImage(wrapper)
    expect(wrapper.find('img').exists()).toBe(false)

    const other = {
      title: 'Another Track',
      artist: 'Someone Else',
      duration: 0,
      cover_art_url: '/api/audiocontrol/library/mpd/image/b3RoZXI',
    } as unknown as Song
    findCoverArt.mockResolvedValue(songResult('/api/audiocontrol/library/mpd/image/b3RoZXI'))

    await wrapper.setProps({ song: other })
    await flushPromises()

    expect(wrapper.find('img').attributes('src')).toBe('/api/audiocontrol/library/mpd/image/b3RoZXI')
  })
})
