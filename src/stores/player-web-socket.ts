import { ref } from 'vue'
import { defineStore } from 'pinia'

import { usePlayerStore, PLAYER_CONFIG } from '@/stores/player'

import type {
  WsController,
  createPlayerWebSocketOptions,
  Subscription,
  WsPlayerEvent,
} from '@/types/web-socket'

export const usePlayerWebSocket = defineStore('player-web-socket', () => {
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
    wsController.value = createPlayerWebSocket({
      hostname: window.location.hostname,
      // port: window.location.port || 1080, // TODO uncomment when prod is ready
      port: 1080, // TODO remove when prod is ready (for localhost is now)
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
        // handlePlayerEvent(data)
        handlePlayerEvent(data, {}) // TODO make handlePlayerEvent
      },
      onError: (error: Event) => {
        console.error('WebSocket error:', error)
      },
    })

    console.log('wsController.value', wsController.value)

    // Connect to the WebSocket
    wsController.value.connect()
  }

  function createPlayerWebSocket(options: createPlayerWebSocketOptions) {
    let socket: WebSocket | null = null
    let reconnectTimer: number | undefined = undefined

    const wsUrl = `ws://${options.hostname}:${options.port}/api/events`
    console.log('wsUrl', wsUrl)

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
          console.log('WebSocket connected')
          // updateStatusUI(true)
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

        console.log('socket', socket)
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
    if (!wsController.value) return

    const socket = wsController.value.getSocket()
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot subscribe to player events: WebSocket not open')
      return
    }

    // Get the player name to subscribe to
    /*


    let playerToSubscribe

    if (currentPlayerName) {
      // We have a specific player selected
      playerToSubscribe = currentPlayerName
      console.log(`Using selected player for subscription: ${playerToSubscribe}`)
    } else {
      // No specific player selected, get the actual active player name
      try {
        playerToSubscribe = await PlayerFunctions.change_active_player()
        if (!playerToSubscribe) {
          console.warn('Failed to get active player name, using first available player')
          // Try to fetch all players and use the first one if available
          const players = await PlayerFunctions.fetchPlayers()
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
    */

    // Subscribe to player events
    // wsController.value.subscribe(playerToSubscribe, [
    wsController.value.subscribe('mpd', [
      'state_changed',
      'song_changed',
      'position_changed',
      'loop_mode_changed',
      'shuffle_changed',
      'capabilities_changed',
      'metadata_changed',
      'song_information_update',
    ])
  }

  /**
   * Handle player events received from WebSocket
   * @param {Object} data - The event data
   * @param {Object} options - Options for handling the event
   * @param {string} options.currentPlayerName - The current player name
   * @param {Object} options.currentData - The current player data
   * @param {function} options.fetchPlayers - Function to fetch players
   * @param {function} options.fetchCurrentPlayer - Function to fetch current player
   * @param {function} options.updatePlayerInfo - Function to update player info
   * @param {function} options.updateNowPlaying - Function to update now playing info
   * @param {function} options.updateControlButtons - Function to update control buttons
   * @param {function} options.updateSongInfo - Function to update song info
   * @param {function} options.fetchQueue - Function to fetch the queue
   * @param {Object} options.playerCapabilities - The player capabilities
   */

  function handlePlayerEvent(data, options) {
    console.log('handlePlayerEvent data', data)
    console.log('handlePlayerEvent options', options)

    setTimeout(() => {
      console.log('fetchCurrentPlayer ws')

      playerStore.fetchCurrentPlayer()
    }, PLAYER_CONFIG.fastUpdateAfterCommand)

    /*
    const {
      currentPlayerName,
      currentData,
      fetchPlayers,
      fetchCurrentPlayer,
      updatePlayerInfo,
      updateNowPlaying,
      updateControlButtons,
      updateSongInfo,
      fetchQueue,
      playerCapabilities,
    } = options

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
    // Check if this event is for our current player
    // When currentPlayerName is null, we're using the "Default (Active Player)" option
    // In this case, we need to handle events from the active player
    const isForCurrentPlayer =
      (!currentPlayerName &&
        (isActivePlayer === true || data.is_active === true || data.is_active_player === true)) || // Event for active player
      (currentPlayerName && playerName === currentPlayerName) // Event for a specific player we are viewing

    // If we still can't determine if this event is for us, but we're using the active player,
    // just assume it's for us since "active" is no longer supported in the WebSocket subscription
    // and the server may not be sending the is_active flag
    const assumeActiveForDefaultSelection =
      !currentPlayerName && !isActivePlayer && isActivePlayer !== false

    console.log(
      `Event ${eventType} is for player ${playerName || 'unknown'}, is active: ${isActivePlayer}, current player is ${currentPlayerName || 'active'}. ${isForCurrentPlayer || assumeActiveForDefaultSelection ? 'Processing' : 'Ignoring'}.`,
    )

    if (isForCurrentPlayer || assumeActiveForDefaultSelection) {
      // Update UI based on event type
      switch (eventType) {
        case 'PlayerChanged':
        case 'PlayerAdded':
        case 'PlayerRemoved':
          // Player list might have changed, or active player changed
          fetchPlayers() // Refresh player dropdown
          // If the active player changed, or our selected player was removed, we might need to refresh now-playing
          fetchCurrentPlayer()
          break
        case 'StateChanged':
          // Update playback state and related UI elements
          if (currentData) {
            currentData.state = data.state
            // Potentially update position if included, though full fetch might be better
            if (data.position !== undefined) currentData.position = data.position
            updateControlButtons(currentData)
            updatePlayerInfo(currentData) // Update state display in player info
            updateNowPlaying(currentData) // Update progress bar and play/pause icon
          } else {
            fetchCurrentPlayer() // Fetch if no current data
          }
          break
        case 'SongChanged':
          // Update with new song information
          if (currentData) {
            currentData.song = data.song
            currentData.position = data.position !== undefined ? data.position : 0
            // If loop/shuffle status is part of this event, update them too
            if (data.loop_mode !== undefined) currentData.loop_mode = data.loop_mode
            if (data.shuffle !== undefined) currentData.shuffle = data.shuffle

            updateNowPlaying(currentData)
            updateSongInfo(currentData.song) // Make sure this function exists and is comprehensive
            updateControlButtons(currentData) // Controls might change based on new song/state
            if (playerCapabilities.hasQueue) fetchQueue() // Refresh queue if song changes
          } else {
            fetchCurrentPlayer() // Fetch if no current data
          }
          break
        case 'PlaybackPosition':
          // Update playback position
          if (currentData && currentData.song) {
            currentData.position = data.position
            updateNowPlaying(currentData) // This updates the progress bar
          }
          break
        case 'LoopModeChanged':
          if (currentData) {
            currentData.loop_mode = data.loop_mode
            updateControlButtons(currentData) // Updates loop button
          }
          break
        case 'ShuffleChanged':
          if (currentData) {
            currentData.shuffle = data.shuffle
            updateControlButtons(currentData) // Updates shuffle button
          }
          break
        case 'QueueChanged':
          // Queue has changed, refresh it
          if (playerCapabilities.hasQueue) {
            fetchQueue()
          }
          break
        case 'SongInformationUpdate':
        case 'song_information_update':
          // Update song information (cover art, liked status, etc.) without changing the entire song
          if (currentData && currentData.song && data.song) {
            console.log('Received song information update:', data.song)

            // Merge the updated song information with the existing song object
            Object.assign(currentData.song, data.song)

            // Update song info in the UI
            updateSongInfo(currentData.song)

            // Also update the now playing display as it might include artwork
            updateNowPlaying(currentData)
          }
          break
        case 'MetadataChanged':
          // Handle metadata changes similarly to song information updates
          if (currentData && currentData.song && data.metadata) {
            console.log('Received metadata change:', data.metadata)

            // Update song metadata if present in the event
            if (data.metadata.song) {
              Object.assign(currentData.song, data.metadata.song)
              updateSongInfo(currentData.song)
              updateNowPlaying(currentData)
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

  return {
    // State
    wsController,
    // Getters
    // Action
    setupWebSocket,
    createPlayerWebSocket,
    subscribeToPlayerEvents,
    handlePlayerEvent,
  }
})
