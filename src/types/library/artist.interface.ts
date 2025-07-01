import type { Metadata } from './metadata.interface.ts'
import type { PosterItem } from '@/types/library'

export interface ArtistBase {
  id: string
  name: string
  is_multi: boolean
}
export interface Artist extends ArtistBase, PosterItem {
  album_count: number
  thumb_url: string[]
}
export interface ArtistMetadata extends ArtistBase {
  metadata: Metadata
}
