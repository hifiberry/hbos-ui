<template>
  <div class="lastfm-integration">
    <div class="card">
      <div class="service-item">
        <div class="service-main">
          <div class="service-info">
            <AppIcon icon="last-fm" class="service-icon" />
            <div class="service-details">
              <h3>Last.fm</h3>
              <p class="service-description">Scrobble your music and get personalized recommendations</p>
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

// State
const isConnected = ref(false)
const username = ref('')
const isConnecting = ref(false)
const isDisconnecting = ref(false)
const isAuthInProgress = ref(false)
const errorMessage = ref('')
const statusMessage = ref('Checking Last.fm connection status...')
const authProgressStep = ref('Waiting for redirection...')

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
onMounted(() => {
  console.log('Last.fm component mounted')

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
.lastfm-integration {
  .card {
    margin-bottom: 24px;
  }

  .service-item {
    display: flex;
    flex-direction: column;
    padding: 24px 32px 24px 20px;
    transition: all 0.3s ease;

    .service-main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 16px;
    }

    @media (max-width: 768px) {
      padding: 20px;

      .service-main {
        flex-direction: row;
        align-items: center;
        gap: 16px;
      }
    }

    .service-info {
      display: flex;
      align-items: center;
      gap: 28px;
      flex: 1;

      .service-icon {
        width: 40px;
        height: 40px;
        color: var(--color-icon-primary);
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;

        :deep(svg) {
          width: 28px;
          height: 28px;
          object-fit: contain;
        }
      }

      .service-details {
        flex: 1;

        h3 {
          margin: 0 0 4px 0;
          color: var(--color-head);
          font-size: 1.125rem;
        }

        .service-description {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: var(--color-body-secondary);
        }

        .service-status {
          font-size: 14px;
        }
      }
    }

    .service-actions {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 16px;
    }
  }

  .status-indicator {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;

    &.connected {
      background-color: #e6f7e6;
      color: #2d7d2d;
    }

    &.disconnected {
      background-color: #f5f5f5;
      color: #666;
    }

    &.error {
      background-color: #ffe6e6;
      color: #d51007;
    }
  }

  .btn-action {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 80px;

    &.btn-connect {
      background: var(--primary);
      color: white;

      &:hover:not(:disabled) {
        background: var(--primary-dark, var(--primary));
        opacity: 0.9;
      }

      &:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.3);
      }
    }

    &.btn-disconnect {
      background: var(--color-error, #dc3545);
      color: white;

      &:hover:not(:disabled) {
        background: var(--color-error-dark, #c82333);
        opacity: 0.9;
      }

      &:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.3);
      }
    }

    &.btn-cancel {
      background: var(--cover-placeholder-bg, #f0f0f0);
      color: var(--color-body-secondary);
      border: 1px solid var(--color-sidebar-border, transparent);

      &:hover:not(:disabled) {
        background: var(--color-body-secondary, #e0e0e0);
        color: var(--color-head);
        border-color: var(--color-head);
      }

      &:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(var(--color-head-rgb), 0.1);
      }
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .auth-section {
    border-top: 1px solid var(--color-border);
    padding-top: 15px;
    margin-top: 15px;

    .auth-content {
      background-color: var(--color-background-secondary);
      padding: 15px;
      border-radius: 6px;

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
    border-top: 1px solid var(--color-border);
    padding-top: 15px;
    margin-top: 15px;

    .error-content {
      background-color: #ffe6e6;
      padding: 15px;
      border-radius: 6px;

      .error-message {
        margin: 0;
        font-size: 14px;
        color: #d51007;
        font-weight: 500;
      }
    }
  }
}
</style>
