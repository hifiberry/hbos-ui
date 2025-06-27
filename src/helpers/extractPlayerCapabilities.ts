import type { CurrentPlayer, Capabilities } from '@/types/player'

// Default player capabilities (all disabled)
export const DEFAULT_CAPABILITIES = {
  canPlay: false,
  canPause: false,
  canStop: false,
  canPrevious: false,
  canNext: false,
  canSeek: false,
  hasQueue: false,
  canShuffle: false,
  canLoop: false,
}

export function extractPlayerCapabilities(data: CurrentPlayer): Capabilities {
  const capabilities = { ...DEFAULT_CAPABILITIES }

  if (!data || !data.player) {
    return capabilities
  }

  // Check if player metadata contains capabilities information
  if (data.player.metadata && data.player.metadata.capabilities) {
    const caps = data.player.metadata.capabilities
    capabilities.canPlay = caps.includes('play')
    capabilities.canPause = caps.includes('pause')
    capabilities.canStop = caps.includes('stop')
    capabilities.canPrevious = caps.includes('previous')
    capabilities.canNext = caps.includes('next')
    capabilities.canSeek = caps.includes('seek')
    capabilities.hasQueue = caps.includes('queue')
    capabilities.canShuffle = caps.includes('shuffle') || caps.includes('random')
    capabilities.canLoop = caps.includes('loop')
    return capabilities
  }

  // Alternative: Check if capabilities are directly in player info
  if (data.player.capabilities) {
    const caps = data.player.capabilities
    capabilities.canPlay = caps.includes('play')
    capabilities.canPause = caps.includes('pause')
    capabilities.canStop = caps.includes('stop')
    capabilities.canPrevious = caps.includes('previous')
    capabilities.canNext = caps.includes('next')
    capabilities.canSeek = caps.includes('seek')
    capabilities.hasQueue = caps.includes('queue')
    capabilities.canShuffle = caps.includes('shuffle') || caps.includes('random')
    capabilities.canLoop = caps.includes('loop')
    return capabilities
  }

  // Fallback: If no explicit capabilities, infer from player state
  // Most players will support basic operations
  if (data.player.is_active) {
    capabilities.canPlay = true
    capabilities.canPause = true
    capabilities.canStop = true

    // Assume track navigation if a song is playing
    if (data.song) {
      capabilities.canPrevious = true
      capabilities.canNext = true
    }

    // If player has shuffle or loop state, assume it can change these
    if (typeof data.shuffle === 'boolean') {
      capabilities.canShuffle = true
    }

    if (data.loop_mode) {
      capabilities.canLoop = true
    }

    // If position is reported, assume seeking is possible
    if (data.position !== undefined && data.position !== null) {
      capabilities.canSeek = true
    }

    // If the player has a library, assume it also has a queue
    if (data.player.has_library) {
      capabilities.hasQueue = true
    }
  }

  return capabilities
}
