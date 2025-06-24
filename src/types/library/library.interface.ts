export interface Player {
  player_name: string
  has_library: boolean
  is_loaded: boolean
}

export interface PlayerResponse {
  players: Player[]
}
