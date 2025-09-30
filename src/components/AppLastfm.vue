<template>
  <div class="lastfm-integration">
    <div class="card">
      <div class="service-item">
        <div class="service-main">
          <div class="service-info">
            <AppIcon icon="last-fm" class="service-icon" />
            <div class="service-details">
              <h3>Last.fm</h3>
              <p class="service-description">Scrobble your music, set your favourite tracks and get recommendations</p>
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
              @click="connectToLastFM"
              :disabled="isConnecting"
              class="btn-action btn-connect"
            >
              Connect
            </button>
            <button
              v-else-if="isConnected"
              @click="disconnectFromLastFM"
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
                <span class="setting-label">Enable scrobbling:</span>
                <label class="toggle-switch disabled">
                  <input
                    type="checkbox"
                    v-model="settingsStore.getLastfmSettings.scrobble"
                    @change="saveLastfmSettings"
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
                    v-model="settingsStore.getLastfmSettings.manageFavourites"
                    @change="saveLastfmSettings"
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
              <p>You will be redirected to Last.fm to authorize this application. Once authorized, return to this page. We will automatically try to complete the connection.</p>
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
import AppIcon from '@/components/app-icon.vue'
import {
  getLastFMStatus,
  startLastFMAuth,
  prepareLastFMAuthCompletion,
  completeLastFMAuth,
  disconnectLastFM
} from '@/api/lastfm'
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
const statusMessage = ref('Checking Last.fm connection status...')
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
    return 'Connected to Last.fm';
  } else if (errorMessage.value) {
    return 'Connection error';
  } else {
    return 'Not connected to Last.fm';
  }
});

// Local Storage Keys
const LASTFM_TOKEN_KEY = 'lastfm_request_token'

// Methods
const clearError = () => {
  errorMessage.value = ''
}

const updateStatus = (message: string) => {
  statusMessage.value = message
}

const startAuthPolling = () => {
  console.log('Starting auth polling...')
  if (authPollInterval) {
    clearInterval(authPollInterval)
  }
  isAuthInProgress.value = true
  authPollInterval = setInterval(attemptToCompleteAuth, 5000)
}

const stopAuthPolling = () => {
  console.log('Stopping auth polling...')
  if (authPollInterval) {
    clearInterval(authPollInterval)
    authPollInterval = null
  }
  isAuthInProgress.value = false
}

const attemptToCompleteAuth = async () => {
  if (!isAuthInProgress.value && !localStorage.getItem(LASTFM_TOKEN_KEY)) {
    stopAuthPolling()
    return
  }

  console.log('Attempting to complete Last.fm auth...')
  updateStatus('Checking Last.fm authorization status...')

  try {
    const data = await completeLastFMAuth()
    console.log('Auth completion attempt response:', data)

    if (data.authenticated === true) {
      updateStatus(`Connected to Last.fm as ${data.username}.`)
      localStorage.removeItem(LASTFM_TOKEN_KEY)
      sessionStorage.removeItem('lastfm_auth_in_progress')
      isConnected.value = true
      username.value = data.username || ''
      stopAuthPolling()
    } else if (
      data.error === 'TokenNotAuthorized' ||
      (data.error === 'ApiError' && data.error_description?.startsWith('Unauthorized Token'))
    ) {
      updateStatus('Waiting for you to authorize ACR on the Last.fm website. We will keep checking...')
      // Continue polling
    } else {
      // Any other error, stop polling
      const errorMsg = data.error_description || data.error || 'Unknown error during authentication.'
      updateStatus(`Error connecting to Last.fm: ${errorMsg}`)
      stopAuthPolling()
    }
  } catch (error) {
    console.error('Error during auth completion:', error)
    updateStatus('Error connecting to Last.fm. Check console for details.')
    stopAuthPolling()
  }
}

const prepareBackendForAuthCompletion = async (token: string) => {
  updateStatus('Resuming session: Notifying backend of your request token...')
  console.log('Preparing backend for auth completion with token:', token)

  try {
    const data = await prepareLastFMAuthCompletion(token)
    console.log('Prepare auth completion response:', data)

    if (data.success) {
      updateStatus('Resuming session: Backend ready. If you have already authorized on Last.fm, we will now poll for completion.')
      startAuthPolling()
    } else {
      updateStatus(`Failed to prepare backend for auth resumption: ${data.error || 'Unknown error'}. Please try connecting again.`)
      localStorage.removeItem(LASTFM_TOKEN_KEY)
      isConnecting.value = false
    }
  } catch (error) {
    console.error('Error preparing backend for auth completion:', error)
    updateStatus('Failed to resume session (network/parse error). Check console. Please try connecting again.')
    localStorage.removeItem(LASTFM_TOKEN_KEY)
    isConnecting.value = false
  }
}

const connectToLastFM = async () => {
  isConnecting.value = true
  clearError()
  authProgressStep.value = 'Requesting authorization URL...'

  // Clear any existing polling
  stopAuthPolling()
  localStorage.removeItem(LASTFM_TOKEN_KEY)

  // Set flag to indicate auth is in progress
  sessionStorage.setItem('lastfm_auth_in_progress', 'true')

  try {
    const authData = await startLastFMAuth()

    if (authData.url && authData.request_token) {
      localStorage.setItem(LASTFM_TOKEN_KEY, authData.request_token)
      console.log('Request token stored:', authData.request_token)

      authProgressStep.value = 'Notifying backend of new token...'

      // Prepare backend for auth completion
      await prepareBackendForAuthCompletion(authData.request_token)

      // Open Last.fm authorization page
      window.open(authData.url, '_blank')

      // Check if there was an error during preparation
      if (!errorMessage.value) {
        updateStatus('Please authorize ACR on the Last.fm page that just opened. We will check for completion automatically.')
      }
    } else {
      const errorMsg = authData.error || 'Could not get auth URL or request token.'
      errorMessage.value = `Error: ${errorMsg}`
      updateStatus('Failed to start Last.fm connection.')
      isConnecting.value = false
      sessionStorage.removeItem('lastfm_auth_in_progress')
    }
  } catch (error) {
    console.error('Error in connectToLastFM:', error)
    errorMessage.value = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    updateStatus('Failed to start Last.fm connection (network/fetch error).')
    isConnecting.value = false
    sessionStorage.removeItem('lastfm_auth_in_progress')
  }
}

const disconnectFromLastFM = async () => {
  isDisconnecting.value = true
  clearError()

  try {
    const data = await disconnectLastFM()

    if (!data.authenticated && !data.error) {
      updateStatus('Not connected to Last.fm.')
      isConnected.value = false
      username.value = ''
      localStorage.removeItem(LASTFM_TOKEN_KEY)
      console.log('Successfully disconnected from Last.fm.')
    } else {
      const errorMsg = data.error_description || data.error || 'Unknown error during disconnect.'
      errorMessage.value = `Error disconnecting: ${errorMsg}`
      console.error('Error disconnecting from Last.fm:', errorMsg)
    }
  } catch (error) {
    console.error('Error during disconnectFromLastFM:', error)
    errorMessage.value = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
  } finally {
    isDisconnecting.value = false
  }
}

const abortAuth = () => {
  console.log('Aborting Last.fm authentication...')
  stopAuthPolling()
  localStorage.removeItem(LASTFM_TOKEN_KEY)
  sessionStorage.removeItem('lastfm_auth_in_progress')
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

const saveLastfmSettings = async () => {
  try {
    await settingsStore.updateLastfmSettings({
      scrobble: settingsStore.getLastfmSettings.scrobble,
      manageFavourites: settingsStore.getLastfmSettings.manageFavourites
    })
    console.log('Last.fm settings saved successfully')
  } catch (error) {
    console.error('Failed to save Last.fm settings:', error)
  }
}

const checkStatus = async () => {
  updateStatus('Checking Last.fm connection status...')
  console.log('Checking Last.fm status...')

  try {
    const data = await getLastFMStatus()
    console.log('Status response:', data)

    if (data.authenticated === true) {
      updateStatus(`Connected to Last.fm as ${data.username}.`)
      isConnected.value = true
      username.value = data.username || ''
      localStorage.removeItem(LASTFM_TOKEN_KEY)
    } else {
      updateStatus('Not connected to Last.fm. You can connect using the button below.')
      isConnected.value = false
      username.value = ''

      // Check for stored token to resume session
      const storedToken = localStorage.getItem(LASTFM_TOKEN_KEY)
      console.log('Not connected. Checking for stored token:', storedToken)

      if (storedToken) {
        console.log('Token found in localStorage. Attempting to resume session.')
        await prepareBackendForAuthCompletion(storedToken)
      } else {
        console.log('No stored token found. Waiting for user to initiate connection.')
      }
    }
  } catch (error) {
    console.error('Error checking Last.fm status:', error)
    updateStatus('Failed to check Last.fm status. Network error or invalid server response.')
    errorMessage.value = 'Failed to check Last.fm status. Please try again.'
  }
}

// Lifecycle
onMounted(async () => {
  console.log('Last.fm component mounted')

  // Initialize settings store
  if (!settingsStore.loaded) {
    await settingsStore.loadSettings()
  }

  // Check if there's an ongoing authorization that should be aborted due to page refresh
  const storedToken = localStorage.getItem(LASTFM_TOKEN_KEY)
  if (storedToken) {
    console.log('Found stored token on page load - checking if auth was in progress')
    // If we have a stored token but we're starting fresh (page refresh),
    // we should abort any ongoing authorization to prevent confusion
    const wasAuthInProgress = sessionStorage.getItem('lastfm_auth_in_progress')
    if (wasAuthInProgress) {
      console.log('Auth was in progress before page refresh - aborting')
      abortAuth()
    }
  }

  // Clear the session storage flag
  sessionStorage.removeItem('lastfm_auth_in_progress')

  checkStatus()
})

onUnmounted(() => {
  stopAuthPolling()
})
</script>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;

.lastfm-integration {
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
