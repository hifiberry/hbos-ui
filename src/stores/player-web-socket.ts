import { ref } from 'vue'
import { defineStore } from 'pinia'

import { usePlayerStore, PLAYER_CONFIG } from '@/stores/player'
import { useDebounceFn } from '@vueuse/core'

import { useAppConfigStore } from '@/stores/appconfig'

import type {
  WsController,
  createPlayerWebSocketOptions,
  Subscription,
  WsPlayerEvent,
} from '@/types/web-socket'

export const usePlayerWebSocket = defineStore('player-web-socket', () => {
  const configStore = useAppConfigStore()
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

    // Subscribe to player events.
    // audiocontrol filters by these exact names, so a name that the server
    // never emits silently drops the event: the handler below is then dead
    // code. Keep this list in sync with convert_to_websocket_message in
    // audiocontrol (src/api/events.rs).
    wsController.value.subscribe(playerToSubscribe, [
      'state_changed',
      'song_changed',
      'position_changed',
      'loop_mode_changed',
      'shuffle_changed',
      // audiocontrol < 0.9.1 emitted the shuffle event as 'random_changed'.
      // Subscribe to both so shuffle also works against older devices; the
      // handler treats them identically.
      'random_changed',
      'capabilities_changed',
      'song_information_update',
    ])

    // Also subscribe to volume events (system-wide events)
    await subscribeToVolumeEvents()
  }

  // Subscribe to volume control events
  async function subscribeToVolumeEvents() {
    console.log('subscribeToVolumeEvents')

    if (!wsController.value) {
      console.warn('Cannot subscribe to volume events: No wsController')
      return
    }

    const socket = wsController.value.getSocket()
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot subscribe to volume events: WebSocket not open')
      return
    }

    console.log('Subscribing to volume events')

    // Subscribe to volume events (these are system-wide, not player-specific)
    wsController.value.subscribe('*', [
      'volume_changed',
    ])
  }

  // ! using debounceHandlePlayerEvent
  function handlePlayerEvent(data: WsPlayerEvent) {
    console.log('>>> handlePlayerEvent data', data)

    const eventType = data.type
    if (!eventType) {
      console.log('Unknown event format:', data)
      return
    }

    // Volume events are system-wide and carry no meaningful player source.
    if (eventType === 'volume_changed') {
      console.log('Volume event received:', eventType, data)
      playerStore.fetchVolumeState()
      return
    }

    // With no player explicitly selected we follow the active player, so every
    // event we subscribed to is relevant. With a specific player selected,
    // only that player's events are.
    const selectedPlayer = playerStore.currentPlayerName
    const isForCurrentPlayer = !selectedPlayer || data.player_name === selectedPlayer

    console.log(
      `Event ${eventType} is for player ${data.player_name || 'unknown'}, current player is ${selectedPlayer || 'active'}. ${isForCurrentPlayer ? 'Processing' : 'Ignoring'}.`,
    )

    // The payload is deliberately not read: any relevant event triggers a
    // refetch of the whole player state, debounced by the caller.
    if (isForCurrentPlayer) {
      playerStore.fetchCurrentPlayer()
    }
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
    subscribeToVolumeEvents,
    handlePlayerEvent,
    debounceHandlePlayerEvent,
  }
})
