import type { LoopMode, Song } from '@/types/player'

export interface Subscription {
  players: string[] | null
  event_types: string[] | null
}

export interface WsController {
  connect: () => void
  disconnect: () => void
  getSocket: () => WebSocket | null
  updateSubscription: (subscription: Subscription) => boolean
  subscribe: (playerName: string, eventTypes: string[]) => boolean
}

export interface WsPlayerEvent {
  player_name: string // 'mpd'
  player_id?: string // 'mpd:6600'
  is_active?: boolean // true | false
  is_active_player?: boolean // true | false
  type?: string // 'state_changed'
  event_type?: string // 'state_changed'
  state?: string // 'playing'
  metadata?: {
    title: string // 'Updated Song Title'
    artist: string // 'Updated Artist'
    album: string // 'Updated Album'
    artwork_url: string // 'http://example.com/updated_image.jpg'
    song?: Song
  }
  capabilities?: string[] // ['play', 'pause', 'stop', 'next', 'previous', 'seek', 'shuffle', 'loop', 'queue']
  shuffle?: boolean // true | false
  enabled?: boolean // true | false
  mode?: LoopMode // LoopModeLowercase | "No" | "None" | "Song" | "Track" | "Playlist"
  loop_mode?: LoopMode // LoopModeLowercase | "No" | "None" | "Song" | "Track" | "Playlist"
  song?: Song
  percentage?: number // 75
  position?:
    | {
        position: number // 45.5
        duration: number // 180.0
      }
    | number // 45.5
  source?: {
    player_id: string // 'mpd:6600'
    player_name: string // 'mpd'
    is_active?: boolean // true | false
    is_active_player?: boolean // true | false
  }
}

export interface createPlayerWebSocketOptions {
  hostname?: string
  port?: string | number
  onConnect: () => void
  onDisconnect: (event: Event) => void
  onMessage: (data: WsPlayerEvent) => void
  onError: (error: Event) => void
}
