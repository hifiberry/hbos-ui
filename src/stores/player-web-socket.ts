import { ref } from 'vue'
import { defineStore } from 'pinia'

import { usePlayerStore, PLAYER_CONFIG } from '@/stores/player'
import { useDebounceFn } from '@vueuse/core'

import { useConfigStore } from '@/stores/config'

import type {
  WsController,
  createPlayerWebSocketOptions,
  Subscription,
  WsPlayerEvent,
} from '@/types/web-socket'

export const usePlayerWebSocket = defineStore('player-web-socket', () => {
  const configStore = useConfigStore()
  const playerStore = usePlayerStore()

  // State
  const wsController = ref<WsController | null>(null)

  // Actions
  // Setup WebSocket connection
  const setupWebSocket = () => {
    console.log('setupWebSocket')

    // Close any existing WebSocket controller
    if (wsController.value) {
      wsController.value.disconnect()
      wsController.value = null
    }

    // Create a new WebSocket controller
    const wsUrl = configStore.getWsBaseUrl()
    console.log('WebSocket URL from config:', wsUrl)

    try {
      const url = new URL(wsUrl)
      console.log('Parsed WebSocket URL - hostname:', url.hostname, 'port:', url.port, 'pathname:', url.pathname)

      wsController.value = createPlayerWebSocket({
        hostname: url.hostname,
        port: parseInt(url.port) || configStore.config.audiocontrol_api.devicePort,
        apiPrefix: url.pathname,
      onConnect: () => {
        console.log('WebSocket connected')
        // Use async/await with the subscribe function
        ;(async () => {
          await subscribeToPlayerEvents()
        })()
      },
      onDisconnect: (event: Event) => {
        console.log('WebSocket disconnected', event)
      },
      onMessage: (data: WsPlayerEvent) => {
        debounceHandlePlayerEvent(data)
      },
      onError: (error: Event) => {
        console.error('WebSocket error:', error)
      },
    })

    console.log('wsController.value', wsController.value)

    // Connect to the WebSocket
    wsController.value.connect()
    } catch (error) {
      console.error('Failed to parse WebSocket URL:', wsUrl, error)
      // Don't create WebSocket controller if URL parsing fails
      wsController.value = null
    }
  }

  function createPlayerWebSocket(options: createPlayerWebSocketOptions) {
    let socket: WebSocket | null = null
    let reconnectTimer: number | undefined = undefined

    const wsUrl = `ws://${options.hostname}:${options.port}${options.apiPrefix || '/api'}/events`

    // Connect to WebSocket
    const connect = () => {
      if (socket) {
        return // Already connected or connecting
      }

      try {
        // Clear any pending reconnect timer
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
          reconnectTimer = undefined
        }

        socket = new WebSocket(wsUrl)

        socket.onopen = () => {
          console.log('socket.onopen')
          if (options.onConnect) {
            options.onConnect()
          }
        }

        socket.onclose = (event) => {
          console.log(`WebSocket closed (code: ${event.code}, reason: ${event.reason || 'none'})`)

          // Call disconnect callback
          if (options.onDisconnect) {
            options.onDisconnect(event)
          }

          // Schedule reconnect
          socket = null
          if (reconnectTimer) {
            clearTimeout(reconnectTimer)
          }
          reconnectTimer = setTimeout(connect, PLAYER_CONFIG.wsReconnectInterval)
        }

        socket.onerror = (error) => {
          console.error('WebSocket error:', error)
          if (options.onError) {
            options.onError(error)
          }
        }
        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('WebSocket message received:', data)

            // Handle welcome message and subscription updates
            if (data.type === 'welcome' || data.type === 'subscription_updated') {
              console.log(`WebSocket ${data.type} message:`, data.message)
              return
            }

            if (options.onMessage) {
              options.onMessage(data)
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }
      } catch (error) {
        console.error('Failed to connect WebSocket:', error)

        if (options.onError) {
          options.onError(error as Event)
        }
        // Schedule reconnect after error
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
        }
        reconnectTimer = setTimeout(connect, PLAYER_CONFIG.wsReconnectInterval)
      }
    }

    // Disconnect from WebSocket
    const disconnect = () => {
      console.log('ws disconnect')

      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = undefined
      }

      if (socket) {
        socket.close()
        socket = null
      }
    }

    // Get the socket object
    const getSocket = () => socket

    // Return controller object with public methods
    return {
      connect,
      disconnect,
      getSocket,
      updateSubscription: (subscription: Subscription) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(subscription))
          return true
        }
        return false
      },
      subscribe: (playerName: string, eventTypes: string[]): boolean => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          // Create subscription object
          const subscription = {
            players: playerName ? [playerName] : null,
            event_types: eventTypes && eventTypes.length > 0 ? eventTypes : null,
          }

          // Send subscription
          socket.send(JSON.stringify(subscription))
          console.log(`Subscribed to player events: ${JSON.stringify(subscription)}`)
          return true
        }
        return false
      },
    }
  }

  // Subscribe to events for the current player
  async function subscribeToPlayerEvents() {
    console.log('subscribeToPlayerEvents')

    if (!wsController.value) {
      console.warn('Cannot subscribe to player events: No wsController - will retry when connected')
      return
    }

    const socket = wsController.value.getSocket()
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot subscribe to player events: WebSocket not open - will retry when connected')
      return
    }

    // Get the player name to subscribe to

    let playerToSubscribe

    if (playerStore.currentPlayerName) {
      // We have a specific player selected
      playerToSubscribe = playerStore.currentPlayerName
      console.log(`Using selected player for subscription: ${playerToSubscribe}`)
    } else {
      // No specific player selected, get the actual active player name
      try {
        playerToSubscribe = await playerStore.retrieveActivePlayer()
        console.log('playerToSubscribe after retrieveActivePlayer()', playerToSubscribe)

        if (!playerToSubscribe) {
          console.warn('Failed to get active player name, using first available player')
          // Try to fetch all players and use the first one if available
          const players = await playerStore.fetchPlayers()
          console.log('players after fetchPlayers()', players)

          if (players && players.length > 0) {
            playerToSubscribe = players[0].name
            console.log(`Using first available player for subscription: ${playerToSubscribe}`)
          } else {
            console.error('No players available for subscription')
            return // No players available, can't subscribe
          }
        } else {
          console.log(`Retrieved active player for subscription: ${playerToSubscribe}`)
        }
      } catch (error) {
        console.error('Error getting active player name:', error)
        return // Can't subscribe without a valid player
      }
    }

    if (!playerToSubscribe) {
      console.error('No player name available for subscription')
      return // Can't subscribe without a valid player
    }

    console.log(`Subscribing to player events for: ${playerToSubscribe}`)

    // Subscribe to player events
    wsController.value.subscribe(playerToSubscribe, [
      'state_changed', // ! We don't get the data.position on 'state_changed'
      'song_changed',
      'position_changed', // ! We don't get 'position_changed', instead getting 'state_changed'
      'loop_mode_changed', // ! We don't get 'loop_mode_changed', nothing getting
      'shuffle_changed', // ! We don't get 'loop_mode_changed', nothing getting
      'capabilities_changed',
      'metadata_changed',
      'song_information_update',
    ])
  }

  // ! using debounceHandlePlayerEvent
  function handlePlayerEvent(data: WsPlayerEvent) {
    console.log('>>> handlePlayerEvent data', data)

    // Handle different API response formats
    let eventType, playerName, isActivePlayer, source

    // Get the event type (could be in different formats)
    if (data.event_type) {
      // Camel case format (event_type key)
      eventType = data.event_type
      source = data.source || {}
      playerName = source.player_name
      isActivePlayer = source.is_active_player
    } else if (data.type) {
      // Snake case format (type key from WebSocket)
      eventType = data.type
      playerName = data.player_name
      // For snake_case format, assume it's for the active player
      // unless explicitly specified
      isActivePlayer = data.is_active_player
    } else {
      console.log('Unknown event format:', data)
      return
    }

    // Check if this event is for our current player
    // When currentPlayerName is null, we're using the "Default (Active Player)" option
    // In this case, we need to handle events from the active player
    const isForCurrentPlayer =
      (!playerStore.currentPlayerName &&
        (isActivePlayer === true || data.is_active === true || data.is_active_player === true)) || // Event for active player
      (playerStore.currentPlayerName && playerName === playerStore.currentPlayerName) // Event for a specific player we are viewing

    // If we still can't determine if this event is for us, but we're using the active player,
    // just assume it's for us since "active" is no longer supported in the WebSocket subscription
    // and the server may not be sending the is_active flag
    const assumeActiveForDefaultSelection =
      !playerStore.currentPlayerName && !isActivePlayer && isActivePlayer !== false

    if (isForCurrentPlayer || assumeActiveForDefaultSelection) {
      // ! using debounceHandlePlayerEvent to debounce fetchCurrentPlayer()
      playerStore.fetchCurrentPlayer()
    }

    console.log(
      `Event ${eventType} is for player ${playerName || 'unknown'}, is active: ${isActivePlayer}, current player is ${playerStore.currentPlayerName || 'active'}. ${isForCurrentPlayer || assumeActiveForDefaultSelection ? 'Processing' : 'Ignoring'}.`,
    )

    // !!! We don't get some messages and some information on data
    // !!! that's why we don't use this logic yet
    /*
      // Map snake_case event types to camelCase
      if (eventType) {
        switch (eventType) {
          case 'state_changed':
            eventType = 'StateChanged'
            if (data.state) {
              data.state = data.state
            }
            break
          case 'song_changed':
            eventType = 'SongChanged'
            break
          case 'position_changed':
            eventType = 'PlaybackPosition'
            break
          case 'loop_mode_changed':
            eventType = 'LoopModeChanged'
            if (data.mode) {
              data.loop_mode = data.mode
            }
            break
          case 'random_changed':
          case 'shuffle_changed':
            eventType = 'ShuffleChanged'
            if (data.enabled !== undefined) {
              data.shuffle = data.enabled
            }
            break
          case 'queue_changed':
            eventType = 'QueueChanged'
            break
          case 'capabilities_changed':
            eventType = 'CapabilitiesChanged'
            break
          case 'song_information_update':
            eventType = 'SongInformationUpdate'
            break
          case 'metadata_changed':
            eventType = 'MetadataChanged'
            break
        }
      }

      if (isForCurrentPlayer || assumeActiveForDefaultSelection) {
        // Update UI based on event type
        switch (eventType) {
          case 'PlayerChanged':
          case 'PlayerAdded':
          case 'PlayerRemoved':
            console.log('PlayerChanged')

            // ! for now we have only mpd player
            // Player list might have changed, or active player changed
            playerStore.fetchPlayersAndUpdatePlayerDropdown() // Refresh player dropdown
            // If the active player changed, or our selected player was removed, we might need to refresh now-playing
            playerStore.fetchCurrentPlayer()
            break
          case 'StateChanged':
            // Update playback state and related UI elements
            console.log('StateChanged')

            if (playerStore.currentData) {
              const _currentData = {
                ...playerStore.currentData,
                state: data.state,
              }

              // Potentially update position if included, though full fetch might be better
              // ! We don't get data.position
              if (data.position != undefined) {
                if (typeof data.position === 'string') {
                  _currentData.position = data.position
                } else if (typeof data.position === 'object' && data.position.position) {
                  _currentData.position = data.position.position
                }
              }

              playerStore.currentData = _currentData
            } else {
              playerStore.fetchCurrentPlayer() // Fetch if no current data
            }
            break
          case 'SongChanged':
            console.log('SongChanged')

            // Update with new song information
            if (playerStore.currentData) {
              const _currentData = {
                ...playerStore.currentData,
                song: data.song,
              }

              // ! We don't get data.position
              if (data.position != undefined) {
                if (typeof data.position === 'string') {
                  _currentData.position = data.position
                } else if (typeof data.position === 'object' && data.position.position) {
                  _currentData.position = data.position.position
                }
              } else {
                _currentData.position = 0
              }

              if (data.loop_mode !== undefined) _currentData.loop_mode = data.loop_mode
              if (data.shuffle !== undefined) _currentData.shuffle = data.shuffle

              playerStore.currentData = _currentData

              // if (playerCapabilities.hasQueue) fetchQueue() // ! we dont handle this yet: Refresh queue if song changes
            } else {
              playerStore.fetchCurrentPlayer() // Fetch if no current data
            }
            break
          case 'PlaybackPosition': // ! We don't get this message
            // Update playback position
            if (playerStore.currentData && playerStore.currentData.song) {
              const _currentData = {
                ...playerStore.currentData,
              }

              if (typeof data.position === 'string') {
                _currentData.position = data.position
              } else if (typeof data.position === 'object' && data.position.position) {
                _currentData.position = data.position.position
              }

              playerStore.currentData = _currentData
            }
            break
          case 'LoopModeChanged': // ! We don't get this message
            console.log('LoopModeChanged')

            if (playerStore.currentData) {
              const _currentData = {
                ...playerStore.currentData,
              }

              _currentData.loop_mode = data.loop_mode

              playerStore.currentData = _currentData
            }
            break
          case 'ShuffleChanged': // ! We don't get this message
            console.log('ShuffleChanged')

            if (playerStore.currentData) {
              const _currentData = {
                ...playerStore.currentData,
              }

              _currentData.shuffle = data.shuffle

              playerStore.currentData = _currentData
            }
            break
          case 'QueueChanged':
            console.log('QueueChanged')

            // Queue has changed, refresh playlist if player supports it
            const { playerCapabilities } = playerStore
            if (playerCapabilities.hasQueue) {
              // Import and refresh playlist store
              import('@/stores/playlist').then((module) => {
                const { usePlaylistStore } = module
                const playlistStore = usePlaylistStore()
                playlistStore.fetchQueue()
              })
            }
            break
          case 'SongInformationUpdate':
          case 'song_information_update':
            console.log('SongInformationUpdate')

            // Update song information (cover art, liked status, etc.) without changing the entire song
            if (playerStore.currentData && playerStore.currentData.song && data.song) {
              console.log('Received song information update:', data.song)

              // Merge the updated song information with the existing song object
              const _currentData = {
                ...playerStore.currentData,
                song: data.song,
              }

              playerStore.currentData = _currentData
            }
            break
          case 'MetadataChanged':
            console.log('MetadataChanged')

            // Handle metadata changes similarly to song information updates
            if (playerStore.currentData && playerStore.currentData.song && data.metadata) {
              console.log('Received metadata change:', data.metadata)

              // Update song metadata if present in the event
              if (data.metadata.song) {
                const _currentData = {
                  ...playerStore.currentData,
                  song: data.metadata.song,
                }

                playerStore.currentData = _currentData
              }
            }
            break
          default:
            console.log('Unhandled event type:', eventType)
        }
      } else {
        console.log(
          `Event ${eventType} is for player ${playerName || 'unknown'}, but not relevant for current selection (${currentPlayerName || 'Default (Active Player)'}). Ignoring.`,
        )
      }
    */
  }

  const debounceHandlePlayerEvent = useDebounceFn(
    (data) => handlePlayerEvent(data),
    PLAYER_CONFIG.fastUpdateAfterCommand,
  )

  return {
    // State
    wsController,
    // Getters
    // Action
    setupWebSocket,
    createPlayerWebSocket,
    subscribeToPlayerEvents,
    handlePlayerEvent,
    debounceHandlePlayerEvent,
  }
})
