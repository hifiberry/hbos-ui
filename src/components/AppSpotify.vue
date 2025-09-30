<template>
  <div class="spotify-integration">
    <div class="card">
      <div class="service-item">
        <div class="service-main">
          <div class="service-info">
            <AppIcon icon="spotify" class="service-icon" />
            <div class="service-details">
              <h3>Spotify</h3>
              <p class="service-description">Connect to control playback, and enhance songs with additional meta data</p>
              <div class="service-status">
                <span :class="statusIndicatorClass">
                  {{ statusText }}
                </span>
              </div>
            </div>
          </div>
          <div class="service-actions">
            <button
              v-if="!isConnected && !isAuthInProgress"
              @click="connectToSpotify"
              :disabled="isConnecting"
              class="btn-action btn-connect"
            >
              Connect
            </button>
            <button
              v-else-if="isConnected"
              @click="disconnectFromSpotify"
              :disabled="isDisconnecting"
              class="btn-action btn-disconnect"
            >
              Disconnect
            </button>
            <button
              v-else-if="isAuthInProgress"
              @click="abortAuth"
              class="btn-action btn-cancel"
            >
              Cancel
            </button>
            <!-- Settings caret -->
            <div class="settings-expand">
              <div class="expand-caret" @click="toggleSettingsExpanded">
                <AppIcon icon="caret-down" class="settings-caret" :class="{ expanded: isSettingsExpanded }" />
              </div>
            </div>
          </div>
        </div>

        <!-- Settings Section -->
        <div v-if="isSettingsExpanded" class="settings-section">
          <div class="settings-content">
            <div class="settings-form">
              <div class="setting-option">
                <span class="setting-label">Control player:</span>
                <label class="toggle-switch disabled">
                  <input
                    type="checkbox"
                    v-model="settingsStore.getSpotifySettings.controlPlayer"
                    @change="saveSpotifySettings"
                    disabled
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="setting-option">
                <span class="setting-label">Manage favourites:</span>
                <label class="toggle-switch disabled">
                  <input
                    type="checkbox"
                    v-model="settingsStore.getSpotifySettings.manageFavourites"
                    @change="saveSpotifySettings"
                    disabled
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Auth in Progress Section -->
        <div v-if="isAuthInProgress" class="auth-section">
          <div class="auth-content">
            <div class="auth-instructions">
              <h4>Authentication in Progress</h4>
              <p>You will be redirected to Spotify to authorize this application. Once authorized, return to this page. We will automatically try to complete the connection.</p>
              <p><strong>Current step:</strong> {{ authProgressStep }}</p>
            </div>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="errorMessage" class="error-section">
          <div class="error-content">
            <p class="error-message">{{ errorMessage }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import {
  getSpotifyStatus,
  createSpotifySession,
  getSpotifyLoginUrl,
  pollSpotifyAuth,
  storeSpotifyTokens,
  disconnectSpotify
} from '@/api/spotify'
import { useSettingsStore } from '@/stores/settings'

// Store
const settingsStore = useSettingsStore()

// State
const isConnected = ref(false)
const username = ref('')
const isConnecting = ref(false)
const isDisconnecting = ref(false)
const isAuthInProgress = ref(false)
const errorMessage = ref('')
const statusMessage = ref('Checking Spotify connection status...')
const authProgressStep = ref('Waiting for redirection...')

// Settings state
const isSettingsExpanded = ref(false)

// Polling
let authPollInterval: number | null = null

// Computed
const statusIndicatorClass = computed(() => {
  if (isConnected.value) {
    return 'status-indicator connected';
  } else if (errorMessage.value) {
    return 'status-indicator error';
  } else {
    return 'status-indicator disconnected';
  }
});

const statusText = computed(() => {
  if (isConnected.value) {
    return 'Connected to Spotify';
  } else if (errorMessage.value) {
    return 'Connection error';
  } else {
    return 'Not connected to Spotify';
  }
});

// Local Storage Keys
const SPOTIFY_SESSION_KEY = 'spotify_session_id'

// Methods
const clearError = () => {
  errorMessage.value = ''
}

const updateStatus = (message: string) => {
  statusMessage.value = message
}

const startAuthPolling = (sessionId: string) => {
  console.log('Starting auth polling for session:', sessionId)
  if (authPollInterval) {
    clearInterval(authPollInterval)
  }
  isAuthInProgress.value = true
  authPollInterval = setInterval(() => pollForTokens(sessionId), 5000)
}

const stopAuthPolling = () => {
  console.log('Stopping auth polling...')
  if (authPollInterval) {
    clearInterval(authPollInterval)
    authPollInterval = null
  }
  isAuthInProgress.value = false
}

const pollForTokens = async (sessionId: string) => {
  if (!isAuthInProgress.value) {
    stopAuthPolling()
    return
  }

  console.log('Polling for authentication completion...')
  updateStatus('Checking Spotify authorization status...')

  try {
    const data = await pollSpotifyAuth(sessionId)
    console.log('Poll response:', data)

    if (data.status === 'completed' && data.token_data) {
      updateStatus('Storing authentication tokens...')
      await storeTokens(data.token_data)
      localStorage.removeItem(SPOTIFY_SESSION_KEY)
      sessionStorage.removeItem('spotify_auth_in_progress')
      stopAuthPolling()
    } else if (data.status === 'error') {
      const errorMsg = data.error || 'Unknown error during authentication.'
      updateStatus(`Error connecting to Spotify: ${errorMsg}`)
      errorMessage.value = errorMsg
      stopAuthPolling()
    } else {
      updateStatus('Waiting for you to authorize on the Spotify website. We will keep checking...')
      // Continue polling
    }
  } catch (error) {
    console.error('Error during auth polling:', error)
    updateStatus('Error connecting to Spotify. Check console for details.')
    errorMessage.value = 'Authentication polling failed'
    stopAuthPolling()
  }
}

const storeTokens = async (tokenData: {
  access_token: string
  refresh_token: string
  expires_in: number
}) => {
  try {
    const data = await storeSpotifyTokens(tokenData)
    console.log('Token storage response:', data)

    if (data.status === 'success') {
      updateStatus('Connected to Spotify successfully!')
      await checkStatus()
    } else {
      const errorMsg = data.error || 'Failed to store tokens'
      updateStatus(`Error storing tokens: ${errorMsg}`)
      errorMessage.value = errorMsg
    }
  } catch (error) {
    console.error('Error storing tokens:', error)
    updateStatus('Failed to store authentication tokens')
    errorMessage.value = 'Token storage failed'
  }
}

const connectToSpotify = async () => {
  isConnecting.value = true
  clearError()
  authProgressStep.value = 'Creating authentication session...'

  // Clear any existing polling
  stopAuthPolling()
  localStorage.removeItem(SPOTIFY_SESSION_KEY)

  // Set flag to indicate auth is in progress
  sessionStorage.setItem('spotify_auth_in_progress', 'true')

  try {
    // Create session
    const sessionData = await createSpotifySession()

    if (!sessionData.session_id) {
      throw new Error('Failed to create authentication session')
    }

    localStorage.setItem(SPOTIFY_SESSION_KEY, sessionData.session_id)
    authProgressStep.value = 'Getting authorization URL...'

    // Get login URL
    const loginData = await getSpotifyLoginUrl(sessionData.session_id)
    console.log('Login response received:', loginData)

    if ((loginData.status === 'success' || loginData.status === 'redirect') && loginData.message) {
      authProgressStep.value = 'Opening Spotify authorization...'

      // Clean up the URL
      const spotifyUrl = loginData.message
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')

      // Open Spotify authorization page
      window.open(spotifyUrl, 'spotify_auth_window', 'width=800,height=600')

      updateStatus('Please authorize on the Spotify page that just opened. We will check for completion automatically.')
      startAuthPolling(sessionData.session_id)
    } else {
      console.error('Login response does not contain expected format:', loginData)
      const errorMsg = `Could not get Spotify authorization URL. Response: ${JSON.stringify(loginData)}`
      errorMessage.value = `Error: ${errorMsg}`
      updateStatus('Failed to start Spotify connection.')
      isConnecting.value = false
      sessionStorage.removeItem('spotify_auth_in_progress')
    }
  } catch (error) {
    console.error('Error in connectToSpotify:', error)
    errorMessage.value = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    updateStatus('Failed to start Spotify connection.')
    isConnecting.value = false
    sessionStorage.removeItem('spotify_auth_in_progress')
  }
}

const disconnectFromSpotify = async () => {
  isDisconnecting.value = true
  clearError()

  try {
    const data = await disconnectSpotify()

    if (data.status === 'success') {
      updateStatus('Disconnected from Spotify.')
      isConnected.value = false
      username.value = ''
      localStorage.removeItem(SPOTIFY_SESSION_KEY)
      console.log('Successfully disconnected from Spotify.')
    } else {
      const errorMsg = data.error || 'Unknown error during disconnect.'
      errorMessage.value = `Error disconnecting: ${errorMsg}`
      console.error('Error disconnecting from Spotify:', errorMsg)
    }
  } catch (error) {
    console.error('Error during disconnectFromSpotify:', error)
    errorMessage.value = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
  } finally {
    isDisconnecting.value = false
  }
}

const abortAuth = () => {
  console.log('Aborting Spotify authentication...')
  stopAuthPolling()
  localStorage.removeItem(SPOTIFY_SESSION_KEY)
  sessionStorage.removeItem('spotify_auth_in_progress')
  isConnecting.value = false
  isAuthInProgress.value = false
  clearError()
  updateStatus('Authentication cancelled.')
  authProgressStep.value = 'Waiting for redirection...'
}

// Settings methods
const toggleSettingsExpanded = () => {
  isSettingsExpanded.value = !isSettingsExpanded.value
}

const saveSpotifySettings = async () => {
  try {
    await settingsStore.updateSpotifySettings({
      controlPlayer: settingsStore.getSpotifySettings.controlPlayer,
      manageFavourites: settingsStore.getSpotifySettings.manageFavourites
    })
    console.log('Spotify settings saved successfully')
  } catch (error) {
    console.error('Failed to save Spotify settings:', error)
  }
}

const checkStatus = async () => {
  updateStatus('Checking Spotify connection status...')
  console.log('Checking Spotify status...')

  try {
    const data = await getSpotifyStatus()
    console.log('Status response:', data)

    if (data.authenticated === true) {
      updateStatus(`Connected to Spotify${data.username ? ` as ${data.username}` : ''}.`)
      isConnected.value = true
      username.value = data.username || ''
      localStorage.removeItem(SPOTIFY_SESSION_KEY)
    } else {
      updateStatus('Not connected to Spotify. You can connect using the button below.')
      isConnected.value = false
      username.value = ''

      // Check for stored session to resume
      const storedSession = localStorage.getItem(SPOTIFY_SESSION_KEY)
      if (storedSession) {
        console.log('Session found in localStorage. Attempting to resume authentication.')
        startAuthPolling(storedSession)
      }
    }
  } catch (error) {
    console.error('Error checking Spotify status:', error)
    updateStatus('Failed to check Spotify status. Network error or invalid server response.')
    errorMessage.value = 'Failed to check Spotify status. Please try again.'
  }
}

// URL parameter handling for OAuth callback
const handleOAuthCallback = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const sessionId = urlParams.get('session_id')

  if (sessionId) {
    // Clean up the URL
    history.replaceState({}, document.title, window.location.pathname)

    // Start polling for tokens
    startAuthPolling(sessionId)
  }
}

// Lifecycle
onMounted(async () => {
  console.log('Spotify component mounted')

  // Initialize settings store
  if (!settingsStore.loaded) {
    await settingsStore.loadSettings()
  }

  // Handle OAuth callback
  handleOAuthCallback()

  // Check if there's an ongoing authorization that should be aborted due to page refresh
  const storedSession = localStorage.getItem(SPOTIFY_SESSION_KEY)
  if (storedSession) {
    const wasAuthInProgress = sessionStorage.getItem('spotify_auth_in_progress')
    if (wasAuthInProgress) {
      console.log('Auth was in progress before page refresh - aborting')
      abortAuth()
    }
  }

  // Clear the session storage flag
  sessionStorage.removeItem('spotify_auth_in_progress')

  checkStatus()
})

onUnmounted(() => {
  stopAuthPolling()
})
</script>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;

.spotify-integration {
  .card {
    @include service-card-base;
  }

  .service-item {
    @include service-item-base;

    .service-main {
      @include service-main-layout;
    }

    &.expanded {
      @include service-expanded-state;
    }

    .service-info {
      @include service-info-layout;

      .service-icon {
        @include service-icon-base;
      }

      .service-details {
        @include service-details-base;
      }
    }

    .service-actions {
      @include service-actions-base;
    }
  }

  .status-indicator {
    @include status-indicator-base;
  }

  .btn-action {
    &.btn-connect {
      @include service-button-primary;
    }

    &.btn-disconnect {
      @include service-button-danger;
    }

    &.btn-cancel {
      @include service-button-secondary;
    }
  }

  .auth-section {
    @include service-content-section;

    .auth-content {
      @include service-content-box;

      .auth-instructions {
        h4 {
          margin: 0 0 10px 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--color-head);
        }

        p {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: var(--color-body-secondary);
          line-height: 1.4;

          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }
  }

  .error-section {
    @include service-content-section;

    .error-content {
      @include service-error-box;
    }
  }

  // Settings section styles
  .settings-expand {
    display: flex;
    align-items: center;
    margin-left: 8px;

    .expand-caret {
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.2s ease;

      &:hover {
        background-color: rgba(var(--color-surface-rgb), 0.5);
      }
    }

    .settings-caret {
      width: 16px;
      height: 16px;
      color: var(--color-text-secondary);
      transition: transform 0.2s ease;

      &.expanded {
        transform: rotate(180deg);
      }
    }
  }

  .settings-section {
    @include service-content-section;
    border-top: 1px solid var(--color-border);

    .settings-content {
      padding: 20px;

      h4 {
        margin: 0 0 16px 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--color-head);
      }
    }

    .settings-form {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .setting-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;

        .setting-label {
          font-size: 14px;
          color: var(--color-text);
          font-weight: 500;
        }
      }

      @include service-toggle-switch;
    }
  }
}
</style>
