import { describe, it, expect } from 'vitest'

import { gridImageSize, withImageSize } from '@/api/imagesize'

/**
 * The poster grid draws a fixed square: 140px at or above the `lg` breakpoint
 * (1024px, see assets/scss/variables.scss), 100px below it. What the screen
 * needs is that box multiplied by its device pixel ratio - acr snaps the result
 * up to a ladder rung itself, so nothing here rounds.
 */
describe('gridImageSize', () => {
  it('asks for the 140px box on a desktop viewport at 1x', () => {
    expect(gridImageSize(1440, 1)).toBe(140)
  })

  it('doubles the 140px box on a retina desktop viewport', () => {
    expect(gridImageSize(1440, 2)).toBe(280)
  })

  it('asks for the 100px box below the lg breakpoint', () => {
    expect(gridImageSize(800, 1)).toBe(100)
  })

  it('doubles the 100px box on a phone', () => {
    expect(gridImageSize(800, 2)).toBe(200)
  })

  /** media-down(lg) stops at 1023.98px, so 1024 is already the wide layout. */
  it('treats exactly 1024px as the wide layout', () => {
    expect(gridImageSize(1024, 1)).toBe(140)
  })

  /** Windows and Android report fractional ratios; a partial pixel is a blurry
   *  pixel, so round up rather than down. */
  it('rounds a fractional device pixel ratio up', () => {
    expect(gridImageSize(800, 2.625)).toBe(263)
  })
})

describe('withImageSize', () => {
  const ladder = [100, 140, 200, 280, 400, 800]

  it('appends the requested size to an acr image URL', () => {
    expect(withImageSize('/api/audiocontrol/library/mpd/image/album:12', 280, ladder)).toBe(
      '/api/audiocontrol/library/mpd/image/album:12?size=280',
    )
  })

  /** An acr too old to resize advertises no ladder. Asking anyway would be a
   *  query parameter it ignores, but the honest thing is not to ask. */
  it('leaves the URL alone when the daemon advertises no ladder', () => {
    expect(withImageSize('/api/audiocontrol/library/mpd/image/album:12', 280, [])).toBe(
      '/api/audiocontrol/library/mpd/image/album:12',
    )
  })

  /** Provider art (fanart.tv, TheAudioDB) is served by someone else entirely. */
  it('leaves an external URL alone', () => {
    expect(withImageSize('https://assets.fanart.tv/cover.jpg', 280, ladder)).toBe(
      'https://assets.fanart.tv/cover.jpg',
    )
  })

  it('leaves an empty URL alone', () => {
    expect(withImageSize('', 280, ladder)).toBe('')
  })
})

/**
 * The two stores hand over different URL shapes. The album store builds an
 * absolute URL from `getApiBaseUrl()`; the artist store passes acr's
 * `thumb_url` through `rewriteImageUrl`, which stays relative behind the dev
 * proxy and goes absolute in production. Both are acr images and both must be
 * sized - while a provider URL that reached `thumb_url` untouched (acr only
 * overwrites it when it has a cached image of its own) must not be.
 */
describe('withImageSize across the URL shapes the stores produce', () => {
  const ladder = [100, 140, 200, 280, 400, 800]

  it('sizes an absolute album image URL', () => {
    expect(
      withImageSize('http://192.168.1.12/api/audiocontrol/library/mpd/image/album:12', 280, ladder),
    ).toBe('http://192.168.1.12/api/audiocontrol/library/mpd/image/album:12?size=280')
  })

  it('sizes an absolute artist image URL', () => {
    expect(
      withImageSize('http://192.168.1.12/api/audiocontrol/coverart/artist/VGhl/image', 280, ladder),
    ).toBe('http://192.168.1.12/api/audiocontrol/coverart/artist/VGhl/image?size=280')
  })

  it('sizes a relative artist image URL from the dev proxy', () => {
    expect(withImageSize('/api/audiocontrol/coverart/artist/VGhl/image', 140, ladder)).toBe(
      '/api/audiocontrol/coverart/artist/VGhl/image?size=140',
    )
  })

  /** acr leaves thumb_url alone when a provider already filled it in. */
  it('leaves a provider thumb_url alone', () => {
    expect(withImageSize('https://www.theaudiodb.com/images/media/artist.jpg', 280, ladder)).toBe(
      'https://www.theaudiodb.com/images/media/artist.jpg',
    )
  })
})
