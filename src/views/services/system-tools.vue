<template>
  <div class="system-tools">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'services' }">System Tools</AppBackRouter>
    </div>

    <div class="system-tools-content">
      <div class="services-header">
        <h2>System Tools</h2>
        <p>Advanced system management tools - use with caution as they can leave the system in an unusable state</p>
      </div>

      <!-- Reset System Tool -->
      <div class="tool-section">
        <div class="tool-card reset-tool">
          <div class="tool-info">
            <AppIcon icon="reset" class="tool-icon" />
            <div class="tool-details">
              <h3>Reset System</h3>
              <p class="tool-description">
                Reset the system to factory defaults. This will remove all settings, configurations, and user data.
              </p>
            </div>
          </div>
          <div class="tool-actions">
            <button @click="showResetConfirmation = true" :disabled="resetting" class="reset-button">
              {{ resetting ? 'Resetting...' : 'Reset System' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Auto-detect Sound Card Tool -->
      <div class="tool-section">
        <div class="tool-card detect-tool">
          <div class="tool-info">
            <AppIcon icon="search" class="tool-icon" />
            <div class="tool-details">
              <h3>Auto-detect Sound Card</h3>
              <p class="tool-description">
                Apply default configuration and automatically detect the sound card overlay. Requires a system reboot to take effect.
              </p>
            </div>
          </div>
          <div class="tool-actions">
            <button @click="detectSoundCard" :disabled="detectingSoundCard" class="detect-button">
              {{ detectingSoundCard ? 'Detecting...' : 'Detect card' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Expert Mode Toggle Tool -->
      <div class="tool-section">
        <div class="tool-card expert-tool">
          <div class="tool-info">
            <AppIcon icon="tabler/user-star" class="tool-icon" />
            <div class="tool-details">
              <h3>Expert Mode</h3>
              <p class="tool-description">
                Enable expert mode to access advanced options
              </p>
            </div>
          </div>
          <div class="tool-actions">
            <div class="expert-toggle">
              <label class="toggle-switch" :class="{ disabled: updatingExpertMode }">
                <input
                  type="checkbox"
                  :checked="getExpertMode"
                  :disabled="updatingExpertMode"
                  @change="toggleExpertMode"
                >
                <span class="toggle-slider" :class="{ loading: updatingExpertMode }"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reset System Confirmation Dialog -->
    <AppConfirmationDialog
      :is-open="showResetConfirmation"
      title="Reset System"
      message="Are you sure you want to reset the system to factory defaults?

This will:
- Remove all settings and configurations
- Delete all user data
- Restore the system to its original state

This action CANNOT BE UNDONE!"
      confirm-button-text="Reset System"
      :is-dangerous="true"
      icon="reset"
      :requires-text-confirmation="true"
      confirmation-text="RESET"
      @close="showResetConfirmation = false"
      @confirm="executeReset"
    />

    <!-- Auto-detect Sound Card Confirmation Dialog -->
    <AppConfirmationDialog
      :is-open="showDetectConfirmation"
      title="Auto-detect Sound Card"
      :message="getDetectConfirmationMessage()"
      :confirm-button-text="detectedCardName ? 'Configure Sound Card' : 'Continue'"
      :is-dangerous="true"
      icon="search"
      @close="showDetectConfirmation = false"
      @confirm="handleDetectConfirmation"
    />

    <!-- Reboot Confirmation Dialog -->
    <AppConfirmationDialog
      :is-open="showRebootConfirmation"
      title="Reboot Required"
      message="Sound card configuration completed. The system needs to be rebooted for changes to take effect.

Would you like to reboot now?"
      confirm-button-text="Reboot Now"
      cancel-button-text="Reboot Later"
      :is-dangerous="true"
      icon="refresh"
      @close="handleRebootLater"
      @confirm="executeReboot"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import AppIcon from '@/components/AppIcon.vue'
import AppBackRouter from '@/components/app-back-router.vue'
import AppConfirmationDialog from '@/components/app-confirmation-dialog.vue'
import { useToastStore } from '@/stores/toast'
import { useSettingsStore } from '@/stores/settings'
import { rebootSystem, detectSoundCard as detectSoundCardAPI, setSoundCardDtoverlay } from '@/api/system'

// State
const resetting = ref(false)
const detectingSoundCard = ref(false)
const updatingExpertMode = ref(false)
const showResetConfirmation = ref(false)
const showDetectConfirmation = ref(false)
const showRebootConfirmation = ref(false)
const detectedCardName = ref<string | null>(null)
const detectedDtoverlay = ref<string | null>(null)

// Stores
const toastStore = useToastStore()
const settingsStore = useSettingsStore()
const { getExpertMode } = storeToRefs(settingsStore)

// Methods
const executeReset = async () => {
  showResetConfirmation.value = false
  await resetSystem()
}

const resetSystem = async () => {
  resetting.value = true

  try {
    // TODO: Implement actual reset functionality
    // For now, just show a message that this is not implemented yet

    await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate async operation

    toastStore.showInfoToast('Reset functionality is not yet implemented. This is a placeholder for future development.')

  } catch (err) {
    console.error('Error resetting system:', err)
    toastStore.showErrorToast('Failed to reset system')
  } finally {
    resetting.value = false
  }
}

const detectSoundCard = async () => {
  detectingSoundCard.value = true

  try {
    // Step 1: Use the soundcard/detect API to detect the sound card
    const response = await detectSoundCardAPI()

    if (response.status === 'success' && response.data) {
      detectedCardName.value = response.data.card_name
      detectedDtoverlay.value = response.data.dtoverlay

      // Step 2: Show the user the detected sound card result and ask if they want to proceed
      showDetectConfirmation.value = true
    } else {
      toastStore.showErrorToast(response.message || 'Failed to detect sound card')
    }

  } catch (err) {
    console.error('Error detecting sound card:', err)
    toastStore.showErrorToast('Failed to detect sound card')
  } finally {
    detectingSoundCard.value = false
  }
}

const getDetectConfirmationMessage = (): string => {
  if (detectedCardName.value) {
    return `Sound card detected: ${detectedCardName.value}

Do you want to configure this sound card?

This will:
- Configure the device tree overlay: ${detectedDtoverlay.value}
- Require a system reboot to take effect`
  } else {
    return `No sound card detected.

Assuming DAC+ Zero/DAC+ Light/Miniamp

Do you want to proceed with the default configuration?

This will:
- Configure the default device tree overlay for DAC+ Zero/DAC+ Light/Miniamp
- Require a system reboot to take effect`
  }
}

const handleDetectConfirmation = async () => {
  showDetectConfirmation.value = false

  try {
    // Step 3: Configure the sound card using the soundcard/dtoverlay API endpoint
    const dtoverlay = detectedDtoverlay.value || 'hifiberry-dac' // Default for DAC+ Zero/DAC+ Light/Miniamp

    const configResponse = await setSoundCardDtoverlay({
      dtoverlay: dtoverlay,
      remove_existing: true
    })

    if (configResponse.status === 'success') {
      const cardName = detectedCardName.value || 'DAC+ Zero/DAC+ Light/Miniamp'
      toastStore.showSuccessToast(`Sound card ${cardName} configured successfully!`)

      // Step 4: Show reboot confirmation dialog
      showRebootConfirmation.value = true
    } else {
      toastStore.showErrorToast(configResponse.message || 'Failed to configure sound card')
    }

  } catch (err) {
    console.error('Error configuring sound card:', err)
    toastStore.showErrorToast('Failed to configure sound card')
  }
}

const executeReboot = async () => {
  showRebootConfirmation.value = false

  try {
    toastStore.showInfoToast('Initiating system reboot...')
    await rebootSystem()
    // If we get here, the reboot was initiated successfully
    toastStore.showSuccessToast('System reboot initiated. The system will restart shortly.')
  } catch (err) {
    console.error('Error rebooting system:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    toastStore.showErrorToast(`Failed to reboot system: ${errorMessage}. Please reboot manually using the system controls.`)
  }
}

const handleRebootLater = () => {
  showRebootConfirmation.value = false
  toastStore.showInfoToast('Please reboot the system manually for changes to take effect.')
}

const toggleExpertMode = async () => {
  updatingExpertMode.value = true

  try {
    const newMode = !getExpertMode.value
    await settingsStore.updateExpertMode(newMode)

    const modeText = newMode ? 'enabled' : 'disabled'
    toastStore.showSuccessToast(`Expert mode ${modeText}`)
  } catch (err) {
    console.error('Error updating expert mode:', err)
    toastStore.showErrorToast('Failed to update expert mode')
  } finally {
    updatingExpertMode.value = false
  }
}
</script>

<style scoped lang="scss">
.system-tools {
  .breadcrumbs {
    margin-bottom: 32px;
  }

  .services-header {
    margin-bottom: 32px;

    h2 {
      margin: 0 0 8px 0;
      color: var(--color-head);
    }

    p {
      margin: 0;
      color: var(--color-body-secondary);
    }
  }

  .tool-section {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }

    .tool-card {
      background: var(--background-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;

      .tool-info {
        display: flex;
        align-items: center;
        gap: 16px;
        flex: 1;

        .tool-icon {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
        }

        .tool-details {
          flex: 1;

          h3 {
            margin: 0 0 4px 0;
            color: var(--color-head);
            font-size: 1.1rem;
            font-weight: 600;
          }

          .tool-description {
            margin: 0;
            color: var(--color-body-secondary);
            font-size: 0.9rem;
            line-height: 1.4;
          }
        }
      }

      &.reset-tool .tool-info .tool-icon {
        color: var(--color-error);
      }

      &.detect-tool .tool-info .tool-icon {
        color: var(--color-primary);
      }

      &.expert-tool .tool-info .tool-icon {
        color: var(--color-icon);
      }

      .tool-actions {
        flex-shrink: 0;

        button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.9rem;
          transition: background-color 0.2s ease;

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          svg {
            width: 16px;
            height: 16px;
          }
        }

        .reset-button {
          background: var(--color-error, #ef4444);

          &:hover:not(:disabled) {
            background: var(--color-error-dark, #dc2626);
          }
        }

        .detect-button {
          background: var(--color-error, #ef4444);

          &:hover:not(:disabled) {
            background: var(--color-error-dark, #dc2626);
          }
        }
      }

      .expert-toggle {
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          cursor: pointer;

          input {
            opacity: 0;
            width: 0;
            height: 0;
          }

          .toggle-slider {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--color-body-secondary);
            transition: 0.3s;
            border-radius: 24px;

            &.loading {
              opacity: 0.6;
            }

            &:before {
              position: absolute;
              content: "";
              height: 18px;
              width: 18px;
              left: 3px;
              bottom: 3px;
              background-color: white;
              transition: 0.3s;
              border-radius: 50%;
            }
          }

          input:checked + .toggle-slider {
            background-color: var(--primary);
          }

          input:checked + .toggle-slider:before {
            transform: translateX(20px);
          }

          input:focus + .toggle-slider {
            box-shadow: 0 0 1px var(--primary);
          }

          &.disabled {
            cursor: not-allowed;
            opacity: 0.6;

            .toggle-slider {
              background-color: #e5e5e5;
              cursor: not-allowed;

              &:before {
                background-color: #d0d0d0;
              }
            }

            input:checked + .toggle-slider {
              background-color: #c0c0c0;

              &:before {
                background-color: #a0a0a0;
              }
            }
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .system-tools {
    .tool-section {
      .tool-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;

        .tool-actions {
          width: 100%;

          button {
            width: 100%;
            justify-content: center;
          }
        }
      }
    }
  }
}
</style>
