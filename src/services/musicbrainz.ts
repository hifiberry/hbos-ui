/**
 * MusicBrainz API Service
 * https://musicbrainz.org/doc/MusicBrainz_API
 */

export interface MusicBrainzArtist {
  id: string
  name: string
  'sort-name': string
  disambiguation?: string
  type?: string
  'type-id'?: string
  gender?: string
  'gender-id'?: string
  country?: string
  'life-span'?: {
    begin?: string
    end?: string
    ended?: boolean
  }
  area?: {
    id: string
    name: string
    'sort-name': string
    'iso-3166-1-codes'?: string[]
  }
  'begin-area'?: {
    id: string
    name: string
    'sort-name': string
  }
  aliases?: Array<{
    name: string
    'sort-name': string
    type?: string
    'type-id'?: string
    primary?: boolean
    locale?: string
  }>
  tags?: Array<{
    count: number
    name: string
  }>
}

export interface MusicBrainzResponse {
  id: string
  name: string
  'sort-name': string
  disambiguation?: string
  type?: string
  gender?: string
  country?: string
  'life-span'?: {
    begin?: string
    end?: string
    ended?: boolean
  }
  area?: {
    name: string
  }
  'begin-area'?: {
    name: string
  }
  aliases?: Array<{
    name: string
    type?: string
    primary?: boolean
    locale?: string
  }>
  tags?: Array<{
    count: number
    name: string
  }>
}

class MusicBrainzService {
  private readonly baseUrl = 'https://musicbrainz.org/ws/2'
  private readonly userAgent = 'HBos-UI/1.0.0 ( https://github.com/hifiberry/hbos-ui )'

  private async fetchWithUserAgent(url: string): Promise<Response> {
    return fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json'
      }
    })
  }

  /**
   * Get artist information by MBID
   * @param mbid MusicBrainz ID of the artist
   * @returns Artist information
   */
  async getArtist(mbid: string): Promise<MusicBrainzResponse | null> {
    try {
      const url = `${this.baseUrl}/artist/${mbid}?fmt=json&inc=aliases+tags+area-rels+genres`
      const response = await this.fetchWithUserAgent(url)

      if (!response.ok) {
        console.warn(`MusicBrainz API error: ${response.status} ${response.statusText}`)
        return null
      }

      const data: MusicBrainzArtist = await response.json()

      // Transform the response to a more usable format
      return {
        id: data.id,
        name: data.name,
        'sort-name': data['sort-name'],
        disambiguation: data.disambiguation,
        type: data.type,
        gender: data.gender,
        country: data.country,
        'life-span': data['life-span'],
        area: data.area ? { name: data.area.name } : undefined,
        'begin-area': data['begin-area'] ? { name: data['begin-area'].name } : undefined,
        aliases: data.aliases?.filter(alias => alias.primary || alias.locale === 'en'),
        tags: data.tags?.sort((a, b) => b.count - a.count).slice(0, 10) // Top 10 tags by count
      }
    } catch (error) {
      console.error('Error fetching artist from MusicBrainz:', error)
      return null
    }
  }

  /**
   * Format life span for display
   * @param lifeSpan Life span object from MusicBrainz
   * @returns Formatted life span string
   */
  formatLifeSpan(lifeSpan?: { begin?: string; end?: string; ended?: boolean }): string | null {
    if (!lifeSpan) return null

    const begin = lifeSpan.begin ? new Date(lifeSpan.begin).getFullYear() : '?'
    const end = lifeSpan.ended && lifeSpan.end ? new Date(lifeSpan.end).getFullYear() : (lifeSpan.ended ? '?' : '')

    if (lifeSpan.ended) {
      return `${begin} - ${end}`
    } else if (lifeSpan.begin) {
      return `${begin} - present`
    }

    return null
  }

  /**
   * Get the primary genre/tag for an artist
   * @param tags Array of tags from MusicBrainz
   * @returns Primary genre or null
   */
  getPrimaryGenre(tags?: Array<{ count: number; name: string }>): string | null {
    if (!tags || tags.length === 0) return null
    return tags[0].name
  }

  /**
   * Get formatted location string
   * @param area Current area
   * @param beginArea Birth area
   * @returns Formatted location string
   */
  getFormattedLocation(area?: { name: string }, beginArea?: { name: string }): string | null {
    if (area && beginArea && area.name !== beginArea.name) {
      return `${beginArea.name} / ${area.name}`
    } else if (area) {
      return area.name
    } else if (beginArea) {
      return beginArea.name
    }
    return null
  }
}

export const musicBrainzService = new MusicBrainzService()
