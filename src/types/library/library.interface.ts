export interface LibraryPlayer {
  player_id: string
  player_name: string
  has_library: boolean
  is_loaded: boolean
}

export interface LibraryPlayerResponse {
  players: LibraryPlayer[]
}
