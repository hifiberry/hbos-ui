import type { Metadata } from './metadata.interface.ts'

export interface ArtistBase {
  id: string
  name: string
  is_multi: boolean
}
export interface Artist extends ArtistBase {
  album_count: number
  thumb_url: string[]
  album_count: number
}
export interface ArtistMetadata extends ArtistBase {
  metadata: Metadata
}
