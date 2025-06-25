import type { Artist } from '@/types/library'
import type { Track } from '@/types/library'

export interface Album {
  id: string
  name: string
  release_date: string
  tracks_count: number
  cover_art: string
}
export interface AlbumDetails extends Album {
  artists: string[]
  tracks: Track[]
}
export interface AlbumResponse {
  player_name: string
  album: AlbumDetails
}
export interface AlbumByArtistResponse {
  artists: Artist[]
  count: number
  player_name: string
}
export interface AlbumsResponse {
  player_name: string
  count: number
  albums: Album[]
}
