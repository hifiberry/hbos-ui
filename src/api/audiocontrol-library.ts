import { useAppConfigStore } from '@/stores/appconfig'

export interface LibraryPlayer {
  player_name: string
  player_id: string
  has_library: boolean
  is_loaded: boolean
}

export interface LibraryPlayerListResponse {
  players: LibraryPlayer[]
}

export interface LibraryStatsResponse {
  player_name: string
  player_id: string
  has_library: boolean
  is_loaded: boolean
  albums_count: number
  artists_count: number
  tracks_count: number
}

/**
 * List all players and their library availability
 */
export const getLibraryPlayers = async (): Promise<LibraryPlayerListResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getApiBaseUrl()

  const response = await fetch(`${baseUrl}/library`)

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

/**
 * Get library statistics (albums, artists, tracks) for a specific player
 */
export const getLibraryStats = async (playerName: string): Promise<LibraryStatsResponse> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getApiBaseUrl()

  const response = await fetch(`${baseUrl}/library/${playerName}`)

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

/**
 * Delete an album and all its tracks from the library filesystem.
 * Only works when the active library's supports_delete is true.
 */
export const deleteAlbum = async (playerName: string, albumId: string): Promise<void> => {
  const appConfigStore = useAppConfigStore()
  const baseUrl = appConfigStore.getApiBaseUrl()

  const response = await fetch(`${baseUrl}/library/${playerName}/album/${albumId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message ?? `HTTP error! status: ${response.status}`)
  }
}

/**
 * Get library statistics for all loaded libraries
 */
export const getAllLibraryStats = async (): Promise<LibraryStatsResponse[]> => {
  const list = await getLibraryPlayers()
  const loaded = list.players.filter(p => p.has_library && p.is_loaded)

  return Promise.all(loaded.map(p => getLibraryStats(p.player_name)))
}
