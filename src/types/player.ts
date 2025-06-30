export interface Player {
  name: string // 'mpd'
  id: string // 'mpd:6600'
  state: string // 'stopped', 'playing', 'paused'
  is_active: boolean
  has_library: boolean
  last_seen: string // '2025-06-25T10:55:42.462145804+00:00'
  metadata?: {
    capabilities: string[] // [play, pause, stop, previous, next, seek, queue, shuffle, random, loop]
  }
  capabilities?: string[] // [play, pause, stop, previous, next, seek, queue, shuffle, random, loop]
}

export interface Song {
  title: string // 'November'
  artist: string // 'Limujii'
  album?: string // 'Album Name'
  track_number?: number // 0
  duration: number // 167
  uri?: string // 'spotify:track:1234567890'
  artwork_url?: string // 'http://example.com/image.jpg'
  cover_art_url?: string // '/api/library/mpd/image/Limujii%2FLimujii%20-%20November%20%28freetouse.com%29.mp3'
  stream_url?: string // 'Limujii/Limujii - November (freetouse.com).mp3'
  source?: string // 'mpd'
}

export type LoopModeLowercase = 'no' | 'none' | 'song' | 'track' | 'playlist'
export type LoopMode = LoopModeLowercase | Capitalize<LoopModeLowercase>

export interface CurrentPlayer {
  player?: Player
  song?: Song | null
  state?: string // 'stopped', 'playing', 'paused'
  shuffle: boolean | undefined
  loop_mode?: LoopMode
  position?: number | null // 9.561
}

// Default player capabilities
export interface Capabilities {
  canPlay: boolean
  canPause: boolean
  canStop: boolean
  canPrevious: boolean
  canNext: boolean
  canSeek: boolean
  hasQueue: boolean
  canShuffle: boolean
  canLoop: boolean
}
