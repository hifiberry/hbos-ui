import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseFeed, parseDuration, fetchFeed, FeedError } from '@/services/podcastFeed'

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Hi-Fi Talk</title>
    <itunes:author>Some Host</itunes:author>
    <itunes:image href="https://img/show.jpg"/>
    <itunes:category text="Music"/>
    <item>
      <title>Old one</title>
      <guid>ep-1</guid>
      <pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate>
      <enclosure url="https://a/1.mp3" type="audio/mpeg" length="1"/>
      <itunes:duration>1:02:03</itunes:duration>
      <!-- happy-dom cannot parse CDATA; browsers can. The escaped form is equivalent. -->
      <description>&lt;p&gt;About &lt;b&gt;amps&lt;/b&gt;&lt;/p&gt;</description>
    </item>
    <item>
      <title>New one</title>
      <guid>ep-2</guid>
      <pubDate>Wed, 01 Jan 2025 10:00:00 GMT</pubDate>
      <enclosure url="https://a/2.mp3" type="audio/mpeg" length="1"/>
      <itunes:duration>1800</itunes:duration>
      <itunes:image href="https://img/ep2.jpg"/>
    </item>
    <item>
      <title>Text post without audio</title>
    </item>
  </channel>
</rss>`

describe('parseFeed', () => {
  it('reads the show from the channel', () => {
    expect(parseFeed(FEED).podcast).toEqual({
      title: 'Hi-Fi Talk',
      author: 'Some Host',
      image: 'https://img/show.jpg',
      genre: 'Music',
    })
  })

  it('returns only items with audio, newest first', () => {
    const { episodes } = parseFeed(FEED)
    expect(episodes.map((e) => e.id)).toEqual(['ep-2', 'ep-1'])
    expect(episodes[0]).toMatchObject({ url: 'https://a/2.mp3', duration: 1800, image: 'https://img/ep2.jpg' })
    expect(episodes[1]).toMatchObject({ duration: 3723, description: 'About amps', releaseDate: '2024-01-01T10:00:00.000Z' })
  })

  it('refuses a document that is not an RSS feed', () => {
    expect(() => parseFeed('<html><body>hello</body></html>')).toThrow(FeedError)
    expect(() => parseFeed('not xml at all')).toThrow(FeedError)
  })
})

describe('parseDuration', () => {
  it('reads seconds, mm:ss and hh:mm:ss', () => {
    expect(parseDuration('95')).toBe(95)
    expect(parseDuration('12:30')).toBe(750)
    expect(parseDuration('1:00:01')).toBe(3601)
    expect(parseDuration('')).toBe(0)
    expect(parseDuration('n/a')).toBe(0)
  })
})

describe('fetchFeed', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('refuses an address that is not http(s)', async () => {
    await expect(fetchFeed('example.com/feed')).rejects.toMatchObject({ reason: 'invalid-url' })
    await expect(fetchFeed('ftp://example.com/feed')).rejects.toMatchObject({ reason: 'invalid-url' })
  })

  /** A host without CORS headers makes fetch() reject with a TypeError. */
  it('reports a feed the browser may not read as blocked', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(fetchFeed('https://example.com/feed')).rejects.toMatchObject({ reason: 'blocked' })
  })

  it('reports an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    await expect(fetchFeed('https://example.com/feed')).rejects.toMatchObject({ reason: 'http' })
  })
})
