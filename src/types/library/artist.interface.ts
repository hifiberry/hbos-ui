import type { Metadata } from './metadata.interface.ts'

export interface ArtistBase {
  id: string
  name: string
  is_multi: boolean
}
export interface Artist extends ArtistBase {
  album_count: number
  thumb_url: string[]
}
export interface ArtistMetadata extends ArtistBase {
  metadata: Metadata
}
