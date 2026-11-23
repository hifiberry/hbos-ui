/**
 * Reads a podcast RSS feed in the browser.
 *
 * The feed is fetched directly from its host. That works for the large
 * podcast hosts, which send `Access-Control-Allow-Origin: *`; a host that
 * does not is reported as {@link FeedError} `blocked`.
 */

const ITUNES_NS = 'http://www.itunes.com/dtds/podcast-1.0.dtd'

/** The show described by a feed. */
export interface FeedPodcast {
  title: string
  author: string
  image: string
  genre: string
}

/** One playable episode of a feed. */
export interface FeedEpisode {
  id: string
  title: string
  url: string
  description: string
  /** ISO date, empty if the feed gives none. */
  releaseDate: string
  /** Duration in seconds, 0 if unknown. */
  duration: number
  image: string
}

/** Why a feed could not be read. */
export class FeedError extends Error {
  constructor(
    public readonly reason: 'invalid-url' | 'blocked' | 'http' | 'not-a-feed',
    message: string,
  ) {
    super(message)
    this.name = 'FeedError'
  }
}

/**
 * Returns the first direct child of `parent` with the given name, optionally
 * in the iTunes namespace.
 */
const child = (parent: Element, name: string, itunes = false): Element | null => {
  for (const el of Array.from(parent.children)) {
    if (el.localName !== name) continue
    if (itunes ? el.namespaceURI === ITUNES_NS || el.prefix === 'itunes' : !el.prefix) return el
  }
  return null
}

/** Text content of a child element, trimmed; empty if missing. */
const text = (parent: Element, name: string, itunes = false): string =>
  child(parent, name, itunes)?.textContent?.trim() || ''

/** Removes HTML markup from a feed description. */
const stripHtml = (html: string): string => {
  if (!html.includes('<')) return html.trim()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent || '').trim()
}

/**
 * Parses an `itunes:duration`, which is either seconds or `[hh:]mm:ss`.
 *
 * @param value - The raw duration.
 * @returns The duration in seconds, 0 if it cannot be read.
 */
export const parseDuration = (value: string): number => {
  if (!value) return 0
  const parts = value.trim().split(':').map(Number)
  if (parts.some((part) => isNaN(part))) return 0
  return Math.round(parts.reduce((total, part) => total * 60 + part, 0))
}

/** Converts an RFC 822 feed date to ISO, empty if it cannot be read. */
const toIsoDate = (value: string): string => {
  const date = new Date(value)
  return isNaN(date.getTime()) ? '' : date.toISOString()
}

/** The artwork of an element: `itunes:image href`, else `image/url`. */
const imageOf = (el: Element): string =>
  child(el, 'image', true)?.getAttribute('href')?.trim() ||
  (child(el, 'image') ? text(child(el, 'image') as Element, 'url') : '')

/**
 * Parses the XML of a podcast RSS feed.
 *
 * @param xml - The feed document as text.
 * @returns The show and its playable episodes, newest first.
 * @throws {FeedError} `not-a-feed` if the document is no RSS feed.
 */
export const parseFeed = (xml: string): { podcast: FeedPodcast; episodes: FeedEpisode[] } => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  // A parse error further down still leaves the channel and the items before
  // it, which are worth showing; only a document without a channel is refused.
  const channel = doc.querySelector('rss > channel')
  if (!channel) {
    throw new FeedError('not-a-feed', 'This address does not point to a podcast RSS feed.')
  }

  const podcast: FeedPodcast = {
    title: text(channel, 'title') || 'Untitled podcast',
    author: text(channel, 'author', true) || text(channel, 'managingEditor'),
    image: imageOf(channel),
    genre: child(channel, 'category', true)?.getAttribute('text') || '',
  }

  const episodes = Array.from(channel.children)
    .filter((el) => el.localName === 'item')
    .flatMap((item): FeedEpisode[] => {
      const url = child(item, 'enclosure')?.getAttribute('url')?.trim()
      if (!url) return []
      return [
        {
          id: text(item, 'guid') || url,
          title: text(item, 'title') || 'Untitled episode',
          url,
          description: stripHtml(text(item, 'summary', true) || text(item, 'description')),
          releaseDate: toIsoDate(text(item, 'pubDate')),
          duration: parseDuration(text(item, 'duration', true)),
          image: imageOf(item),
        },
      ]
    })
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))

  return { podcast, episodes }
}

/**
 * Fetches and parses a podcast RSS feed.
 *
 * @param feedUrl - The address of the feed.
 * @returns The show and its playable episodes, newest first.
 * @throws {FeedError} if the feed cannot be fetched or read.
 */
export const fetchFeed = async (
  feedUrl: string,
): Promise<{ podcast: FeedPodcast; episodes: FeedEpisode[] }> => {
  let url: URL
  try {
    url = new URL(feedUrl.trim())
  } catch {
    throw new FeedError('invalid-url', 'Enter a complete feed address, starting with https://')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new FeedError('invalid-url', 'Enter a complete feed address, starting with https://')
  }

  let response: Response
  try {
    response = await fetch(url.toString())
  } catch {
    // A CORS refusal and an unreachable host look the same from here.
    throw new FeedError(
      'blocked',
      'The feed could not be loaded. Check the address; some podcast hosts do not allow their feed to be read from a web page.',
    )
  }
  if (!response.ok) {
    throw new FeedError('http', `The feed server answered with error ${response.status}.`)
  }
  return parseFeed(await response.text())
}
