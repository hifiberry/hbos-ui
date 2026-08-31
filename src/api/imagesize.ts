/**
 * Asking acr for cover art at the size the screen actually shows.
 *
 * acr serves resized variants from `?size=` on its image endpoints, snapping the
 * request up to the next rung of a fixed ladder. The ladder is the clamp, so
 * nothing here rounds: we ask for the exact number of device pixels the box
 * needs and let the daemon decide which variant that is.
 */

/** The poster grid's image box, in CSS pixels (`Poster.vue` `.poster-img`). */
const POSTER_BOX_WIDE_PX = 140
const POSTER_BOX_NARROW_PX = 100

/** The `lg` breakpoint the box shrinks at (`assets/scss/variables.scss`). */
const POSTER_BREAKPOINT_PX = 1024

/**
 * The two acr routes that honour `?size=`, matched by shape rather than by
 * prefix: the stores hand over relative URLs behind the dev proxy and absolute
 * ones in production, and the API prefix itself is configurable.
 */
const RESIZABLE_ROUTES = [
  /\/library\/[^/]+\/image\//, // /library/<player>/image/<identifier>
  /\/coverart\/artist\/[^/]+\/image$/, // /coverart/artist/<name_b64>/image
]

/**
 * Device pixels needed to fill a poster grid cell on this screen.
 *
 * A fractional device pixel ratio (common on Windows and Android) rounds up: a
 * partial pixel is a blurry pixel.
 */
export const gridImageSize = (
  viewportWidth: number = window.innerWidth,
  devicePixelRatio: number = window.devicePixelRatio,
): number => {
  const box = viewportWidth >= POSTER_BREAKPOINT_PX ? POSTER_BOX_WIDE_PX : POSTER_BOX_NARROW_PX
  return Math.ceil(box * devicePixelRatio)
}

/**
 * Append `?size=` to an acr image URL.
 *
 * `sizes` is the ladder from `GET /capabilities`. It is used as the support
 * signal rather than to pick a rung - an acr too old to resize advertises
 * nothing, and asking it for a size it does not understand is noise. Which rung
 * a request lands on is the daemon's decision, not ours.
 */
export const withImageSize = (url: string, size: number, sizes: number[]): string => {
  if (!url || sizes.length === 0) {
    return url
  }

  // Provider art (fanart.tv, TheAudioDB) is served by someone else entirely,
  // and acr leaves an artist's thumb_url alone when a provider already filled
  // it in - so a URL reaching here is not necessarily one of acr's own.
  if (!RESIZABLE_ROUTES.some(route => route.test(url))) {
    return url
  }

  return `${url}?size=${size}`
}
