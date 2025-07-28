<template>
  <div class="system-info">
    <h1>System Information</h1>

    <div class="system-info-content">
      <div v-if="loading" class="loading-section">
        <p>Loading system information...</p>
      </div>

      <div v-else-if="error" class="error-section">
        <div class="error-content">
          <p class="error-message">{{ error }}</p>
          <button @click="fetchSystemInfo" class="retry-button">
            Retry
          </button>
        </div>
      </div>

      <div v-else-if="systemInfo" class="info-tables">
        <!-- Raspberry Pi Information -->
        <div class="info-card">
          <div class="card-header">
            <AppIcon icon="computer" class="card-icon" />
            <h2>Raspberry Pi</h2>
          </div>
          <table class="info-table">
            <tbody>
              <tr v-if="systemInfo?.system?.pretty_hostname || isEditingHostname">
                <td class="label">System Name</td>
                <td class="value">
                  <div v-if="!isEditingHostname" class="hostname-display">
                    <span>{{ systemInfo.system.pretty_hostname || 'Not set' }}</span>
                    <button
                      @click="startEditingHostname"
                      class="edit-button"
                      :disabled="loading"
                    >
                      <AppIcon icon="edit" :width="16" :height="16" />
                    </button>
                  </div>
                  <div v-else class="hostname-edit">
                    <input
                      v-model="editHostname"
                      type="text"
                      placeholder="Enter system name"
                      class="editable-input"
                      :disabled="savingHostname"
                      @keyup.enter="saveHostname"
                      @keyup.escape="cancelEditingHostname"
                    />
                    <div class="editable-actions">
                      <button
                        @click="saveHostname"
                        class="save-button"
                        :disabled="savingHostname || !editHostname.trim()"
                        :title="savingHostname ? 'Saving...' : 'Save'"
                      >
                        <AppIcon icon="checkmark" :width="16" :height="16" />
                      </button>
                      <button
                        @click="cancelEditingHostname"
                        class="cancel-button"
                        :disabled="savingHostname"
                        title="Cancel"
                      >
                        <AppIcon icon="close" :width="16" :height="16" />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td class="label">Model</td>
                <td class="value">{{ systemInfo.pi_model.name }}</td>
              </tr>
              <tr>
                <td class="label">System UUID</td>
                <td class="value uuid">{{ systemInfo.system.uuid }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- HAT Information -->
        <div class="info-card">
          <div class="card-header">
            <AppIcon icon="hifiberry" class="card-icon" />
            <h2>HAT Information</h2>
          </div>
          <table class="info-table">
            <tbody>
              <tr>
                <td class="label">Vendor</td>
                <td class="value">{{ systemInfo.hat_info.vendor }}</td>
              </tr>
              <tr>
                <td class="label">Product</td>
                <td class="value">{{ systemInfo.hat_info.product }}</td>
              </tr>
              <tr>
                <td class="label">UUID</td>
                <td class="value uuid">{{ systemInfo.hat_info.uuid }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Sound Card Information -->
        <div class="info-card">
          <div class="card-header">
            <AppIcon icon="volume" class="card-icon" />
            <h2>Sound Card</h2>
          </div>
          <table class="info-table">
            <tbody>
              <tr>
                <td class="label">Name</td>
                <td class="value">
                  <div v-if="!isEditingSoundCard" class="soundcard-display">
                    <span>{{ transformSoundCardName(systemInfo.soundcard.name) }}</span>
                    <button
                      @click="startEditingSoundCard"
                      class="edit-button"
                      :disabled="loading"
                    >
                      <AppIcon icon="edit" :width="16" :height="16" />
                    </button>
                  </div>
                  <div v-else class="soundcard-edit">
                    <select
                      v-model="selectedSoundCard"
                      class="soundcard-select"
                      :disabled="savingSoundCard"
                    >
                      <option
                        v-for="card in availableSoundCards"
                        :key="card.dtoverlay"
                        :value="card.dtoverlay"
                      >
                        {{ transformSoundCardName(card.name) }}
                      </option>
                    </select>
                    <div class="editable-actions">
                      <button
                        @click="saveSoundCard"
                        class="save-button"
                        :disabled="savingSoundCard || !selectedSoundCard"
                        :title="savingSoundCard ? 'Saving...' : 'Save'"
                      >
                        <AppIcon icon="checkmark" :width="16" :height="16" />
                      </button>
                      <button
                        @click="cancelEditingSoundCard"
                        class="cancel-button"
                        :disabled="savingSoundCard"
                        title="Cancel"
                      >
                        <AppIcon icon="close" :width="16" :height="16" />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td class="label">Volume Control</td>
                <td class="value">{{ systemInfo.soundcard.volume_control }}</td>
              </tr>
              <tr>
                <td class="label">Hardware Index</td>
                <td class="value">{{ systemInfo.soundcard.hardware_index }}</td>
              </tr>
              <tr>
                <td class="label">Channels</td>
                <td class="value">{{ systemInfo.soundcard.output_channels }} out, {{ systemInfo.soundcard.input_channels }} in</td>
              </tr>
              <tr>
                <td class="label">Card Type</td>
                <td class="value">{{ systemInfo.soundcard.card_type.join(', ') }}</td>
              </tr>
              <tr>
                <td class="label">Features</td>
                <td class="value">{{ systemInfo.soundcard.features.join(', ') }}</td>
              </tr>
              <tr>
                <td class="label">DSP Support</td>
                <td class="value">{{ systemInfo.soundcard.supports_dsp ? 'Yes' : 'No' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Favourites Information -->
        <div class="info-card">
          <div class="card-header">
            <AppIcon icon="heart" class="card-icon" />
            <h2>Favourites</h2>
          </div>
          <div v-if="favouritesLoading" class="loading-message">
            Loading favourites information...
          </div>
          <div v-else-if="favouritesError" class="error-message">
            {{ favouritesError }}
          </div>
          <table v-else-if="favouritesInfo" class="info-table">
            <tbody>
              <tr v-for="provider in favouritesInfo.providers" :key="provider.name">
                <td class="label">{{ provider.display_name || provider.name }}</td>
                <td class="value">
                  <div class="provider-info">
                    <span :class="['provider-status', getProviderStatusClass(provider)]">
                      {{ getProviderStatusText(provider) }}
                    </span>
                    <span v-if="provider.favourite_count !== null" class="favourites-count">
                      ({{ provider.favourite_count }} favourite{{ provider.favourite_count !== 1 ? 's' : '' }})
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Cover Art Providers -->
        <div class="info-card">
          <div class="card-header">
            <AppIcon icon="database_star" class="card-icon" />
            <h2>Cover Art Providers</h2>
          </div>
          <div v-if="coverArtLoading" class="loading-message">
            Loading cover art providers...
          </div>
          <div v-else-if="coverArtError" class="error-message">
            {{ coverArtError }}
          </div>
          <table v-else-if="coverArtMethods" class="info-table">
            <tbody>
              <tr v-for="method in coverArtMethods.methods.filter(m => m.method !== 'Url')" :key="method.method">
                <td class="label">{{ method.method }}</td>
                <td class="value">
                  <span class="providers-list">
                    {{ method.providers.map(p => p.display_name).join(', ') }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Sound Card Warning Dialog -->
    <div v-if="showSoundCardWarning" class="warning-overlay">
      <div class="warning-dialog">
        <div class="warning-header">
          <AppIcon icon="bell" class="warning-icon" />
          <h3>Warning: Sound Card Change</h3>
        </div>
        <div class="warning-content">
          <p>
            Selecting an incorrect sound card can make the system unusable and may require manual recovery.
          </p>
          <p>
            Are you sure you want to proceed?
          </p>
        </div>
        <div class="warning-actions">
          <button
            @click="showSoundCardWarning = false"
            class="warning-btn warning-btn--cancel"
          >
            Cancel
          </button>
          <button
            @click="loadSoundCards"
            class="warning-btn warning-btn--confirm"
          >
            Proceed
          </button>
        </div>
      </div>
    </div>

    <!-- Reboot Required Dialog -->
    <div v-if="showRebootDialog" class="warning-overlay">
      <div class="warning-dialog">
        <div class="warning-header">
          <AppIcon icon="checkmark" class="success-icon" />
          <h3>Sound Card Updated</h3>
        </div>
        <div class="warning-content">
          <p>
            Sound card configuration updated successfully.
          </p>
          <p>
            A reboot is required to activate the new settings.
          </p>
        </div>
        <div class="warning-actions">
          <button
            @click="showRebootDialog = false"
            class="warning-btn warning-btn--cancel"
          >
            Later
          </button>
          <button
            @click="rebootSystemHandler"
            class="warning-btn warning-btn--confirm"
            :disabled="rebooting"
          >
            {{ rebooting ? 'Rebooting...' : 'Reboot Now' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/app-icon.vue'
import {
  getSystemInfo,
  updateHostname,
  getSoundCards,
  setSoundCardDtoverlay,
  rebootSystem,
  type SystemInfo,
  type SoundCard
} from '@/api/system'
import { useEditableText } from '@/composables/useEditableField'
import { useFavouritesInfo } from '@/composables/useFavouritesInfo'
import { getCoverArtMethods, type CoverArtMethodsResponse } from '@/api/coverart'

// State
const loading = ref(true)
const error = ref('')
const systemInfo = ref<SystemInfo | null>(null)

// Soundcard editing state
const isEditingSoundCard = ref(false)
const savingSoundCard = ref(false)
const availableSoundCards = ref<SoundCard[]>([])
const selectedSoundCard = ref('')
const showSoundCardWarning = ref(false)
const showRebootDialog = ref(false)
const rebooting = ref(false)

// Favourites composable
const {
  loading: favouritesLoading,
  error: favouritesError,
  favouritesInfo,
  getFavouritesInfo,
  getProviderStatusText,
  getProviderStatusClass
} = useFavouritesInfo()

// Cover art providers state
const coverArtLoading = ref(true)
const coverArtError = ref('')
const coverArtMethods = ref<CoverArtMethodsResponse | null>(null)

// Computed ref for hostname
const currentHostname = computed(() => systemInfo.value?.system?.pretty_hostname)

// Sound card name transformation
const transformSoundCardName = (name: string): string => {
  // Transform long names to shorter versions for display
  const transformations: Record<string, string> = {
    'Beocreate 4-Channel Amplifier': 'Beocreate',
    'DAC+ Zero/Light/MiniAmp': 'DAC+ Zero'
    // Add more transformations here as needed
  }

  return transformations[name] || name
}

// Hostname editing using composable
const hostnameEditing = useEditableText(
  currentHostname,
  async (newHostname: string) => {
    try {
      const response = await updateHostname({
        pretty_hostname: newHostname
      })

      if (response.status === 'success') {
        // Refresh system info to get the updated hostname
        await fetchSystemInfo()
        return { status: 'success' }
      } else {
        return { status: 'error', message: response.message || 'Failed to update system name' }
      }
    } catch (err) {
      console.error('Error updating hostname:', err)
      return {
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      }
    }
  },
  {
    minLength: 1,
    maxLength: 63,
    required: true
  }
)

// Destructure for easier use in template
const {
  isEditing: isEditingHostname,
  editValue: editHostname,
  isSaving: savingHostname,
  startEditing: startEditingHostname,
  cancelEditing: cancelEditingHostname,
  saveEdit: saveHostname
} = hostnameEditing

// Soundcard editing methods
const startEditingSoundCard = async () => {
  // Show warning first before loading sound cards
  showSoundCardWarning.value = true
}

const loadSoundCards = async () => {
  try {
    const response = await getSoundCards()
    if (response.status === 'success') {
      availableSoundCards.value = response.data.soundcards
      // Find current soundcard's dtoverlay
      const currentCard = availableSoundCards.value.find(card =>
        card.name === systemInfo.value?.soundcard.name
      )
      selectedSoundCard.value = currentCard?.dtoverlay || ''
      isEditingSoundCard.value = true
      showSoundCardWarning.value = false
    }
  } catch (err) {
    console.error('Error loading sound cards:', err)
    error.value = 'Failed to load available sound cards'
    showSoundCardWarning.value = false
  }
}

const cancelEditingSoundCard = () => {
  isEditingSoundCard.value = false
  selectedSoundCard.value = ''
  showSoundCardWarning.value = false
}

const saveSoundCard = async () => {
  if (!selectedSoundCard.value) return

  savingSoundCard.value = true
  try {
    const response = await setSoundCardDtoverlay({
      dtoverlay: selectedSoundCard.value,
      remove_existing: true
    })

    if (response.status === 'success') {
      if (response.data?.reboot_required) {
        // Show reboot required modal
        showRebootDialog.value = true
      }

      // Refresh system info
      await fetchSystemInfo()
      isEditingSoundCard.value = false
      selectedSoundCard.value = ''
    } else {
      throw new Error(response.message || 'Failed to update sound card')
    }
  } catch (err) {
    console.error('Error updating sound card:', err)
    error.value = err instanceof Error ? err.message : 'Failed to update sound card'
  } finally {
    savingSoundCard.value = false
  }
}

// Reboot system method
const rebootSystemHandler = async () => {
  rebooting.value = true
  try {
    const response = await rebootSystem({ delay: 5 })

    if (response.status === 'success') {
      // Show success message and hide dialog after a short delay
      setTimeout(() => {
        showRebootDialog.value = false
        // Optionally show a toast or notification that system is rebooting
      }, 2000)
    } else {
      throw new Error(response.message || 'Failed to reboot system')
    }
  } catch (err) {
    console.error('Error rebooting system:', err)
    error.value = err instanceof Error ? err.message : 'Failed to reboot system'
    rebooting.value = false
  }
}

// Methods
const fetchSystemInfo = async () => {
  loading.value = true
  error.value = ''

  try {
    const data = await getSystemInfo()

    if (data.status === 'success') {
      systemInfo.value = data
    } else {
      error.value = data.message || 'Failed to retrieve system information'
    }
  } catch (err) {
    console.error('Error fetching system info:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error occurred'
  } finally {
    loading.value = false
  }
}

const fetchCoverArtMethods = async () => {
  coverArtLoading.value = true
  coverArtError.value = ''

  try {
    const data = await getCoverArtMethods()
    coverArtMethods.value = data
  } catch (err) {
    console.error('Error fetching cover art methods:', err)
    coverArtError.value = err instanceof Error ? err.message : 'Failed to retrieve cover art providers'
  } finally {
    coverArtLoading.value = false
  }
}

// Lifecycle
onMounted(() => {
  fetchSystemInfo()
  getFavouritesInfo()
  fetchCoverArtMethods()
})
</script>

<style scoped lang="scss">
@use '@/assets/scss/mixins' as *;

.system-info {
  h1 {
    margin-bottom: 32px;
    color: var(--color-head);
  }

  .system-info-content {
    .loading-section {
      text-align: center;
      padding: 40px;
      color: var(--color-body-secondary);
    }

    .error-section {
      .error-content {
        background: var(--background-error);
        border: 1px solid var(--color-error);
        border-radius: 8px;
        padding: 20px;
        text-align: center;

        .error-message {
          color: var(--color-error);
          margin-bottom: 16px;
        }

        .retry-button {
          background: var(--color-error);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s ease;

          &:hover {
            background: var(--color-error-dark);
          }
        }
      }
    }

    .info-tables {
      display: grid;
      gap: 24px;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));

        .info-card {
          background: var(--background-card);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 24px;

          .card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;

            .card-icon {
              width: 20px;
              height: 20px;
              color: var(--color-primary);
            }

            h2 {
              margin: 0;
              color: var(--color-head);
              font-size: 1.25rem;
              font-weight: 600;
            }
          }        .info-table {
          width: 100%;
          border-collapse: collapse;

          tbody {
            tr {
              border-bottom: 1px solid var(--color-border);

              &:last-child {
                border-bottom: none;
              }

              td {
                padding: 5px 0;
                vertical-align: top;

                &.label {
                  font-weight: 500;
                  color: var(--color-body-secondary);
                  width: 40%;
                  padding-right: 16px;
                  vertical-align: top;
                  line-height: 1.5;
                }

                &.value {
                  color: var(--color-body);
                  font-family: 'Metropolis', sans-serif;
                  vertical-align: top;
                  line-height: 1.5;

                  &.uuid {
                    font-size: 0.9em;
                    word-break: break-all;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

// Hostname editing styles
.hostname-display {
  display: flex;
  align-items: center;
  min-height: 28px; // Ensure consistent height

  span {
    margin-right: 8px;
    line-height: 1.4;
  }

  .edit-button {
    @include button-icon(28px);
    color: var(--color-body-secondary);
    flex-shrink: 0;

    &:hover:not(:disabled) {
      color: var(--color-primary);
    }
  }
}

.hostname-edit {
  @include editable-field;
}

// Soundcard editing styles
.soundcard-display {
  display: flex;
  align-items: center;
  min-height: 28px; // Ensure consistent height

  span {
    margin-right: 8px;
    line-height: 1.4;
  }

  .edit-button {
    @include button-icon(28px);
    color: var(--color-body-secondary);
    flex-shrink: 0;

    &:hover:not(:disabled) {
      color: var(--color-primary);
    }
  }
}

.soundcard-edit {
  @include editable-field;

  .soundcard-select {
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--background-card);
    color: var(--color-body);
    font-family: 'Metropolis', sans-serif;
    font-size: inherit;
    min-width: 200px;
    margin-right: 8px;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

// Warning dialog styles
.warning-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  .warning-dialog {
    background: var(--background-card, #ffffff);
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 8px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);

    .warning-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;

      .warning-icon {
        width: 24px;
        height: 24px;
        color: var(--color-warning, #f59e0b);
      }

      .success-icon {
        width: 24px;
        height: 24px;
        color: var(--color-success, #10b981);
      }

      h3 {
        margin: 0;
        color: var(--color-head, #111827);
        font-size: 18px;
      }
    }

    .warning-content {
      margin-bottom: 20px;
      line-height: 1.5;
      color: var(--color-text, #374151);

      p {
        margin: 0 0 12px 0;
      }
    }

    .warning-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;

      .warning-btn {
        padding: 10px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
        transition: all 0.2s ease;
        min-width: 80px;

        &--cancel {
          background: var(--color-body-secondary, #6b7280);
          color: white;

          &:hover {
            background: var(--color-text, #374151);
          }
        }

        &--confirm {
          background: var(--color-warning, #f59e0b);
          color: white;

          &:hover:not(:disabled) {
            background: var(--color-warning-dark, #d97706);
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }
      }
    }
  }
}

// Favourites styles
.provider-info {
  display: flex;
  align-items: center;
  gap: 8px;

  .provider-status {
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.875em;

    &.status-active {
      background: var(--background-success);
      color: var(--color-success);
    }

    &.status-inactive {
      background: var(--background-warning);
      color: var(--color-warning);
    }

    &.status-disabled {
      background: var(--background-error);
      color: var(--color-error);
    }
  }

  .favourites-count {
    color: var(--color-body-secondary);
    font-size: 0.875em;
  }
}

.loading-message,
.error-message {
  padding: 16px;
  text-align: center;
  color: var(--color-body-secondary);
  font-style: italic;
}

.error-message {
  color: var(--color-error);
}@media (max-width: 768px) {
  .system-info {
    .system-info-content {
      .info-tables {
        grid-template-columns: 1fr;

        .info-card {
          .info-table {
            tbody {
              tr {
                td {
                  &.label {
                    width: 35%;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
</style>
