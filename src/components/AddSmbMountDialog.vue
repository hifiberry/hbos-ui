<template>
  <div v-if="isOpen" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Add SMB Mount</h2>
        <button @click="closeDialog" class="close-button" title="Close">
          <AppIcon icon="close" />
        </button>
      </div>

      <div class="modal-body">
        <!-- Step 1: Find SMB servers -->
        <div v-if="currentStep === 1" class="step-content">
          <h3>Step 1: Find SMB Servers</h3>
          <p>Discovering SMB/CIFS servers on your network...</p>

          <div v-if="loadingServers" class="loading-section">
            <div class="spinner"></div>
            <p>Scanning network for SMB servers...</p>
          </div>

          <div v-else-if="serverError" class="error-section">
            <p class="error-message">{{ serverError }}</p>
            <button @click="discoverServers" class="retry-button">
              <AppIcon icon="refresh" />
              Retry
            </button>
          </div>

          <div v-else-if="servers.length === 0" class="empty-section">
            <AppIcon icon="network" class="empty-icon" />
            <p>No SMB servers found on your network.</p>
            <button @click="discoverServers" class="retry-button">
              <AppIcon icon="refresh" />
              Scan Again
            </button>
            <p class="help-text">
              You can also manually enter a server address below:
            </p>
            <div class="manual-server-input">
              <input
                v-model="manualServer"
                type="text"
                placeholder="Enter server IP or hostname"
                class="server-input"
              />
              <button @click="addManualServer" :disabled="!manualServer" class="add-button">
                Add
              </button>
            </div>
          </div>

          <div v-else class="servers-list">
            <h4>Found {{ servers.length }} SMB server{{ servers.length !== 1 ? 's' : '' }}:</h4>
            <div class="server-items">
              <div
                v-for="server in servers"
                :key="server.ip"
                class="server-item"
                :class="{ selected: selectedServer?.ip === server.ip }"
                @click="selectServer(server)"
              >
                <div class="server-info">
                  <AppIcon icon="nas" class="server-icon" />
                  <div class="server-details">
                    <h5>{{ server.hostname }}</h5>
                    <p>{{ server.ip }}</p>
                    <p class="server-services">{{ server.services.join(', ') }}</p>
                  </div>
                </div>
                <div class="server-select">
                  <AppIcon v-if="selectedServer?.ip === server.ip" icon="checkmark" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Authentication -->
        <div v-if="currentStep === 2" class="step-content">
          <h3>Step 2: Server Authentication</h3>
          <p>Enter credentials for <strong>{{ selectedServer?.hostname }}</strong></p>

          <div class="auth-form">
            <div class="form-group">
              <label for="authType">Authentication Type</label>
              <select
                id="authType"
                v-model="authType"
                @change="clearAuthError"
              >
                <option value="anonymous">Anonymous (Guest)</option>
                <option value="credentials">Username & Password</option>
              </select>
            </div>

            <div v-if="authType === 'credentials'" class="credentials-form">
              <div class="form-group">
                <label for="username">Username</label>
                <input
                  id="username"
                  v-model="username"
                  type="text"
                  placeholder="Enter username"
                  @input="clearAuthError"
                />
              </div>
              <div class="form-group">
                <label for="password">Password</label>
                <input
                  id="password"
                  v-model="password"
                  type="password"
                  placeholder="Enter password"
                  @input="clearAuthError"
                />
              </div>
            </div>

            <div v-if="authError" class="error-section">
              <p class="error-message">{{ authError }}</p>
            </div>

            <div v-if="testingConnection" class="loading-section">
              <div class="spinner"></div>
              <p>Testing connection to {{ selectedServer?.hostname }}...</p>
            </div>
          </div>
        </div>

        <!-- Step 3: Select Share -->
        <div v-if="currentStep === 3" class="step-content">
          <h3>Step 3: Select Share</h3>
          <p>Choose a share from <strong>{{ selectedServer?.hostname }}</strong></p>

          <div v-if="loadingShares" class="loading-section">
            <div class="spinner"></div>
            <p>Loading shares...</p>
          </div>

          <div v-else-if="shareError" class="error-section">
            <p class="error-message">{{ shareError }}</p>
            <button @click="loadShares" class="retry-button">
              <AppIcon icon="refresh" />
              Retry
            </button>
          </div>

          <div v-else-if="shares.length === 0" class="empty-section">
            <AppIcon icon="material/folder-outlined" class="empty-icon" />
            <p>No shares found on this server.</p>
          </div>

          <div v-else class="shares-list">
            <h4>Available shares:</h4>
            <div class="share-items">
              <div
                v-for="share in shares"
                :key="share.name"
                class="share-item"
                :class="{ selected: selectedShare?.name === share.name }"
                @click="selectShare(share)"
              >
                <div class="share-info">
                  <AppIcon icon="material/folder-outlined" class="share-icon" />
                  <div class="share-details">
                    <h5>{{ share.name }}</h5>
                    <p v-if="share.comment">{{ share.comment }}</p>
                    <p class="share-type">{{ share.type }}</p>
                  </div>
                </div>
                <div class="share-select">
                  <AppIcon v-if="selectedShare?.name === share.name" icon="checkmark" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: Mount Configuration -->
        <div v-if="currentStep === 4" class="step-content">
          <h3>Step 4: Mount Configuration</h3>
          <p>Configure the mount point for <strong>{{ selectedServer?.hostname }}/{{ selectedShare?.name }}</strong></p>

          <div class="mount-form">
            <div class="form-group">
              <label for="mountpoint">Mount Point</label>
              <input
                id="mountpoint"
                v-model="mountPoint"
                type="text"
                placeholder="/mnt/music"
                @input="clearMountError"
              />
              <p class="form-help">Directory where the share will be mounted</p>
            </div>

            <div class="form-group">
              <label for="version">SMB Version</label>
              <select id="version" v-model="smbVersion">
                <option value="3.0">SMB 3.0 (recommended)</option>
                <option value="2.1">SMB 2.1</option>
                <option value="2.0">SMB 2.0</option>
                <option value="1.0">SMB 1.0</option>
              </select>
            </div>

            <div v-if="mountError" class="error-section">
              <p class="error-message">{{ mountError }}</p>
            </div>

            <div v-if="mounting" class="loading-section">
              <div class="spinner"></div>
              <p>Creating mount...</p>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="step-indicator">
          <div class="step-dots">
            <div
              v-for="step in 4"
              :key="step"
              class="step-dot"
              :class="{
                active: step === currentStep,
                completed: step < currentStep
              }"
            ></div>
          </div>
          <p class="step-text">Step {{ currentStep }} of 4</p>
        </div>

        <div class="modal-actions">
          <button
            v-if="currentStep > 1"
            @click="goToPreviousStep"
            class="btn btn-secondary"
          >
            <AppIcon icon="chevron-left" />
            Back
          </button>

          <button
            v-if="currentStep < 4"
            @click="goToNextStep"
            :disabled="!canProceed"
            class="btn btn-primary"
          >
            Next
            <AppIcon icon="chevron-right" />
          </button>

          <button
            v-if="currentStep === 4"
            @click="createMount"
            :disabled="!canCreateMount || mounting"
            class="btn btn-primary"
          >
            <AppIcon icon="plus" />
            Create Mount
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import {
  getSmbServers,
  testSmbServer,
  getSmbShares,
  mountSmbShareWithRetry,
  type SmbServer,
  type SmbShare,
  type SmbMountRequest
} from '@/api/smb'

interface Props {
  isOpen: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'mount-created'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// State
const currentStep = ref(1)
const servers = ref<SmbServer[]>([])
const selectedServer = ref<SmbServer | null>(null)
const manualServer = ref('')
const shares = ref<SmbShare[]>([])
const selectedShare = ref<SmbShare | null>(null)
const authType = ref<'anonymous' | 'credentials'>('anonymous')
const username = ref('')
const password = ref('')
const mountPoint = ref('')
const smbVersion = ref('3.0')

// Loading states
const loadingServers = ref(false)
const testingConnection = ref(false)
const loadingShares = ref(false)
const mounting = ref(false)

// Error states
const serverError = ref('')
const authError = ref('')
const shareError = ref('')
const mountError = ref('')

// Computed properties
const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return selectedServer.value !== null
    case 2:
      return authType.value === 'anonymous' || (username.value && password.value)
    case 3:
      return selectedShare.value !== null
    case 4:
      return mountPoint.value.trim() !== ''
    default:
      return false
  }
})

const canCreateMount = computed(() => {
  return selectedServer.value && selectedShare.value && mountPoint.value.trim() !== ''
})

// Methods
const closeDialog = () => {
  resetDialog()
  emit('close')
}

const handleOverlayClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    closeDialog()
  }
}

const resetDialog = () => {
  currentStep.value = 1
  servers.value = []
  selectedServer.value = null
  manualServer.value = ''
  shares.value = []
  selectedShare.value = null
  authType.value = 'anonymous'
  username.value = ''
  password.value = ''
  mountPoint.value = ''
  smbVersion.value = '3.0'

  // Reset loading states
  loadingServers.value = false
  testingConnection.value = false
  loadingShares.value = false
  mounting.value = false

  // Reset error states
  serverError.value = ''
  authError.value = ''
  shareError.value = ''
  mountError.value = ''
}

const discoverServers = async () => {
  loadingServers.value = true
  serverError.value = ''

  try {
    const response = await getSmbServers()
    if (response.status === 'success') {
      servers.value = response.data.servers
    } else {
      serverError.value = response.message || 'Failed to discover SMB servers'
    }
  } catch (error) {
    console.error('Error discovering SMB servers:', error)
    serverError.value = error instanceof Error ? error.message : 'Failed to discover SMB servers'
  } finally {
    loadingServers.value = false
  }
}

const selectServer = (server: SmbServer) => {
  selectedServer.value = server
}

const addManualServer = () => {
  if (!manualServer.value.trim()) return

  const server: SmbServer = {
    ip: manualServer.value.trim(),
    name: manualServer.value.trim(),
    hostname: manualServer.value.trim(),
    is_file_server: true,
    services: ['SMB'],
    local_network: '',
    interface: ''
  }

  servers.value.push(server)
  selectedServer.value = server
  manualServer.value = ''
}

const testConnection = async () => {
  if (!selectedServer.value) return false

  testingConnection.value = true
  authError.value = ''

  try {
    const response = await testSmbServer(
      selectedServer.value.ip,
      authType.value === 'credentials' ? username.value : undefined,
      authType.value === 'credentials' ? password.value : undefined
    )

    if (response.status === 'success' && response.data.connected) {
      return true
    } else {
      authError.value = response.data.error || response.message || 'Connection test failed'
      return false
    }
  } catch (error) {
    console.error('Error testing connection:', error)
    authError.value = error instanceof Error ? error.message : 'Connection test failed'
    return false
  } finally {
    testingConnection.value = false
  }
}

const loadShares = async () => {
  if (!selectedServer.value) return

  loadingShares.value = true
  shareError.value = ''

  try {
    const response = await getSmbShares(
      selectedServer.value.ip,
      authType.value === 'credentials' ? username.value : undefined,
      authType.value === 'credentials' ? password.value : undefined,
      true
    )

    if (response.status === 'success') {
      shares.value = response.data.shares
    } else {
      shareError.value = response.message || 'Failed to load shares'
    }
  } catch (error) {
    console.error('Error loading shares:', error)
    shareError.value = error instanceof Error ? error.message : 'Failed to load shares'
  } finally {
    loadingShares.value = false
  }
}

const selectShare = (share: SmbShare) => {
  selectedShare.value = share
  // Auto-generate mount point if not set
  if (!mountPoint.value) {
    mountPoint.value = `/mnt/${share.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
  }
}

const createMount = async () => {
  if (!selectedServer.value || !selectedShare.value || !mountPoint.value.trim()) return

  mounting.value = true
  mountError.value = ''

  try {
    const mountRequest: SmbMountRequest = {
      server: selectedServer.value.ip,
      share: selectedShare.value.name,
      mountpoint: mountPoint.value.trim(),
      version: smbVersion.value
    }

    if (authType.value === 'credentials') {
      mountRequest.user = username.value
      mountRequest.password = password.value
    }

    const response = await mountSmbShareWithRetry(mountRequest)

    if (response.status === 'success') {
      emit('mount-created')
      closeDialog()
    } else {
      mountError.value = response.message || 'Failed to create mount'
    }
  } catch (error) {
    console.error('Error creating mount:', error)
    mountError.value = error instanceof Error ? error.message : 'Failed to create mount'
  } finally {
    mounting.value = false
  }
}

const goToNextStep = async () => {
  if (currentStep.value === 2) {
    // Test connection before proceeding to shares
    const connected = await testConnection()
    if (!connected) return

    // Load shares for the next step
    await loadShares()
  }

  currentStep.value = Math.min(currentStep.value + 1, 4)
}

const goToPreviousStep = () => {
  currentStep.value = Math.max(currentStep.value - 1, 1)
}

const clearAuthError = () => {
  authError.value = ''
}

const clearMountError = () => {
  mountError.value = ''
}

// Watchers
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    discoverServers()
  }
})
</script>

<style scoped lang="scss">
@use '@/assets/scss/mixins' as *;
@use '@/assets/scss/popup' as *;
@use '@/assets/scss/variables' as *;

.modal-overlay {
  @include popup-overlay;
}

.modal-content {
  @include popup-container(600px);
}

.modal-header {
  @include popup-header;

  .close-button {
    @include popup-close-button;
  }
}

.modal-body {
  @include popup-content;
  max-height: 60vh;
  overflow-y: auto;

  .step-content {
    h3 {
      margin: 0 0 8px 0;
      color: var(--color-head);
      font-size: 1.2rem;
      font-weight: 600;
    }

    p {
      margin: 0 0 20px 0;
      color: var(--color-body);
      line-height: 1.5;
    }
  }

  .loading-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 40px 20px;
    color: var(--color-body);

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-border);
      border-top: 3px solid var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }

  .error-section {
    padding: 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    margin-bottom: 20px;

    .error-message {
      color: #ef4444;
      margin: 0;
      font-weight: 500;

      &:not(:last-child) {
        margin-bottom: 12px;
      }
    }

    .retry-button {
      background: #ef4444;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      transition: background-color 0.2s;

      &:hover {
        background: #dc2626;
      }
    }
  }

  .empty-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 40px 20px;
    color: var(--color-body);

    .empty-icon {
      width: 48px;
      height: 48px;
      color: var(--color-body-secondary);
    }

    .retry-button {
      background: var(--primary);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      transition: background-color 0.2s;

      &:hover {
        background: var(--primary-dark);
      }
    }

    .help-text {
      color: var(--color-body-secondary);
      font-size: 0.9rem;
      margin-top: 16px;
    }

    .manual-server-input {
      display: flex;
      gap: 8px;
      width: 100%;
      max-width: 300px;

      .server-input {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid var(--color-border);
        border-radius: 6px;
        background: var(--color-bg);
        color: var(--color-body);
        font-size: 0.9rem;

        &:focus {
          outline: none;
          border-color: var(--primary);
        }
      }

      .add-button {
        background: var(--primary);
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: background-color 0.2s;

        &:hover:not(:disabled) {
          background: var(--primary-dark);
        }

        &:disabled {
          background: var(--color-border);
          cursor: not-allowed;
        }
      }
    }
  }

  .servers-list, .shares-list {
    h4 {
      margin: 0 0 16px 0;
      color: var(--color-head);
      font-size: 1rem;
      font-weight: 600;
    }

    .server-items, .share-items {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .server-item, .share-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: var(--primary);
        background: rgba(var(--primary-rgb), 0.05);
      }

      &.selected {
        border-color: var(--primary);
        background: rgba(var(--primary-rgb), 0.1);
      }

      &.share-item {
        padding: 16px 32px 16px 20px;
      }

      .server-info, .share-info {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;

        &.share-info {
          gap: 20px;
        }

        .server-icon, .share-icon {
          width: 24px;
          height: 24px;
          color: var(--color-body-secondary);
        }

        .share-icon {
          width: 48px;
          height: 48px;
        }

        .server-details, .share-details {
          h5 {
            margin: 0 0 4px 0;
            color: var(--color-head);
            font-size: 1rem;
            font-weight: 600;
          }

          p {
            margin: 0;
            color: var(--color-body);
            font-size: 0.9rem;
            line-height: 1.4;

            &.server-services, &.share-type {
              color: var(--color-body-secondary);
              font-size: 0.8rem;
            }
          }
        }
      }

      .server-select, .share-select {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;

        .app-icon {
          width: 20px;
          height: 20px;
          color: var(--primary);
        }
      }
    }
  }

  .auth-form, .mount-form {
    .form-group {
      @include popup-form-group;

      select {
        width: 100%;
        box-sizing: border-box;
      }
    }

    .credentials-form {
      margin-top: 16px;
      padding: 0;
      background: none;
      border: none;
      border-radius: 0;
    }
  }
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-secondary);

  .step-indicator {
    display: flex;
    align-items: center;
    gap: 16px;

    .step-dots {
      display: flex;
      gap: 8px;

      .step-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--color-border);
        transition: all 0.2s;

        &.active {
          background: var(--primary);
          transform: scale(1.2);
        }

        &.completed {
          background: var(--primary);
        }
      }
    }

    .step-text {
      margin: 0;
      color: var(--color-body-secondary);
      font-size: 0.9rem;
    }
  }

  .modal-actions {
    display: flex;
    gap: 12px;

    .btn {
      @include popup-button-secondary;
      display: flex;
      align-items: center;
      gap: 8px;

      &.btn-secondary {
        @include popup-button-cancel;
      }

      &.btn-primary {
        @include popup-button-primary;
      }
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }

  .modal-content {
    max-height: 95vh;
  }

  .modal-header {
    padding: 16px 20px;

    h2 {
      font-size: 1.3rem;
    }
  }

  .modal-body {
    padding: 20px;
  }

  .modal-footer {
    padding: 16px 20px;
    flex-direction: column;
    gap: 16px;
    align-items: stretch;

    .step-indicator {
      justify-content: center;
    }

    .modal-actions {
      justify-content: center;
    }
  }
}
</style>
