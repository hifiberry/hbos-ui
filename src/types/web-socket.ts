import type { ReceivedLoopMode, Song } from '@/types/player'

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

/** Event names audiocontrol emits on the WebSocket. The authoritative list is
 *  convert_to_websocket_message in audiocontrol (src/api/events.rs). */
export type WsEventType =
  | 'state_changed'
  | 'song_changed'
  | 'song_information_update'
  | 'position_changed'
  | 'loop_mode_changed'
  | 'shuffle_changed'
  /** audiocontrol < 0.9.1 emitted the shuffle event under this name. */
  | 'random_changed'
  | 'capabilities_changed'
  | 'queue_changed'
  | 'active_player_changed'
  | 'database_updating'
  | 'volume_changed'

/** A player event as it arrives on the wire.
 *
 *  Only `type` and the common player fields are always present; the rest are
 *  event-specific. Note that the loop mode *received* here uses a different
 *  vocabulary from the one sent in a set_loop command: audiocontrol emits
 *  'no' | 'song' | 'playlist' but accepts 'none' | 'track' | 'playlist'. See
 *  LoopMode in types/player.ts for the command side. */
export interface WsPlayerEvent {
  type: WsEventType
  player_name: string
  player_id?: string
  /** player_id here is built with a hardcoded MPD port and is wrong for other
   *  players; prefer the top-level player_id. */
  source?: {
    player_name: string
    player_id: string
  }

  // state_changed
  state?: string
  // song_changed / song_information_update
  song?: Song | null
  // loop_mode_changed
  mode?: ReceivedLoopMode
  // shuffle_changed ('shuffle' since audiocontrol 0.9.1, 'enabled' before it)
  shuffle?: boolean
  enabled?: boolean
  // capabilities_changed
  capabilities?: string[]
  // position_changed, in seconds
  position?: number
  // active_player_changed
  new_player_id?: string
  // database_updating
  artist?: string
  album?: string
  percentage?: number
  // volume_changed (system-wide, no player source)
  control_name?: string
  display_name?: string
  decibels?: number
  raw_value?: number
}

export interface createPlayerWebSocketOptions {
  hostname?: string
  port?: string | number
  apiPrefix?: string
  onConnect: () => void
  onDisconnect: (event: Event) => void
  onMessage: (data: WsPlayerEvent) => void
  onError: (error: Event) => void
}
