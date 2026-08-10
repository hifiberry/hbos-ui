<template>
  <PageContent title="System Tools" :backrouterLink="{ name: 'services' }">
    <div class="system-tools-content">
      <div class="services-header">
        <h2>System Tools</h2>
        <p>Advanced system management tools. Some of these can leave the system in an unusable state.</p>
      </div>

      <!-- Power Tool -->
      <div class="tool-section">
        <div class="tool-card power-tool">
          <div class="tool-info">
            <Icon icon="power" class="tool-icon" />
            <div class="tool-details">
              <h3>Power</h3>
              <p class="tool-description">
                Restart the device, or shut it down before unplugging it.
              </p>
            </div>
          </div>
          <div class="tool-actions power-actions">
            <button
              @click="pendingPowerAction = 'reboot'"
              :disabled="powerActionRunning"
              class="reset-button"
            >
              Reboot
            </button>
            <button
              @click="pendingPowerAction = 'shutdown'"
              :disabled="powerActionRunning"
              class="reset-button"
            >
              Shut down
            </button>
          </div>
        </div>
      </div>

      <!-- Reset System Tool -->
      <div class="tool-section">
        <div class="tool-card reset-tool">
          <div class="tool-info">
            <Icon icon="tabler/rotate-clockwise" class="tool-icon" />
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
            <Icon icon="tabler/search" class="tool-icon" />
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

      <!-- Sound Card Selection Tool -->
      <div class="tool-section">
        <div class="tool-card soundcard-tool">
          <div class="tool-info">
            <Icon icon="tabler/volume" class="tool-icon" />
            <div class="tool-details">
              <h3>Fixed sound card configuration</h3>
              <p class="tool-description">
                Manually select your sound card. Requires a system reboot to take effect. Incorrect configuration will make your audio device unusable.
              </p>
            </div>
          </div>
          <div class="tool-actions soundcard-actions">
            <select
              v-model="selectedSoundCard"
              class="soundcard-select"
              :disabled="savingSoundCard || loadingSoundCards"
            >
              <option value="" disabled>{{ loadingSoundCards ? 'Loading...' : 'Select a sound card' }}</option>
              <option value="auto-detect">No fixed configuration (auto-detect)</option>
              <option
                v-for="card in availableSoundCards"
                :key="card.name"
                :value="card.name"
              >
                {{ transformSoundCardName(card.name) }}
              </option>
            </select>
            <button
              @click="saveSoundCardSelection"
              :disabled="savingSoundCard || !selectedSoundCard || loadingSoundCards"
              class="save-button"
            >
              {{ savingSoundCard ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Stop All Music Players Tool -->
      <div class="tool-section">
        <div class="tool-card reset-tool">
          <div class="tool-info">
            <Icon icon="tabler/player-pause" class="tool-icon" />
            <div class="tool-details">
              <h3>Stop All Music Players</h3>
              <p class="tool-description">
                Stop all currently running music players to free up resources.
              </p>
            </div>
          </div>
          <div class="tool-actions">
            <button @click="stopAllMusicPlayers" :disabled="stoppingPlayers" class="reset-button">
              {{ stoppingPlayers ? 'Stopping...' : 'Stop All Players' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Support Report Tool -->
      <div class="tool-section">
        <div class="tool-card report-tool">
          <div class="tool-info">
            <Icon icon="tabler/file-text" class="tool-icon" />
            <div class="tool-details">
              <h3>Support Report</h3>
              <p class="tool-description">
                Collect hardware, package versions, service state and recent
                errors for a bug report. Passwords, keys and tokens are removed,
                but please read the report before posting it publicly.
              </p>
            </div>
          </div>
          <div class="tool-actions">
            <button @click="fetchReport" :disabled="loading" class="report-button">
              {{ loading ? 'Collecting...' : 'Create Report' }}
            </button>
          </div>

          <div v-if="report" class="support-report">
            <div class="tool-actions">
              <button @click="downloadReport" class="report-button">Download as file</button>
            </div>
            <pre class="support-report-text">{{ report }}</pre>
          </div>
        </div>
      </div>

      <!-- Expert Mode Toggle Tool -->
      <div class="tool-section">
        <div class="tool-card expert-tool">
          <div class="tool-info">
            <Icon icon="tabler/user-star" class="tool-icon" />
            <div class="tool-details">
              <h3>Expert Mode</h3>
              <p class="tool-description">
                Enable expert mode to access advanced options
              </p>
            </div>
          </div>
          <div class="tool-actions">
            <div class="expert-toggle">
              <ToggleSwitch
                :model-value="getExpertMode"
                :disabled="updatingExpertMode"
                :loading="updatingExpertMode"
                @update:model-value="toggleExpertMode"
              />
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Reset System Confirmation Dialog -->
    <ConfirmationDialog
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
      icon="tabler/rotate-clockwise"
      :requires-text-confirmation="true"
      confirmation-text="RESET"
      @close="showResetConfirmation = false"
      @confirm="executeReset"
    />

    <!-- Auto-detect Sound Card Confirmation Dialog -->
    <ConfirmationDialog
      :is-open="showDetectConfirmation"
      title="Auto-detect Sound Card"
      :message="getDetectConfirmationMessage()"
      :confirm-button-text="detectedCardName ? 'Configure Sound Card' : 'Continue'"
      :is-dangerous="true"
      icon="tabler/search"
      @close="showDetectConfirmation = false"
      @confirm="handleDetectConfirmation"
    />

    <!-- Reboot Confirmation Dialog -->
    <ConfirmationDialog
      :is-open="showRebootConfirmation"
      title="Reboot Required"
      message="Sound card configuration completed. The system needs to be rebooted for changes to take effect.

Would you like to reboot now?"
      confirm-button-text="Reboot Now"
      cancel-button-text="Reboot Later"
      :is-dangerous="true"
      icon="tabler/refresh"
      @close="handleRebootLater"
      @confirm="executeReboot"
    />

    <!-- Power Confirmation Dialog -->
    <ConfirmationDialog
      :is-open="pendingPowerAction !== null"
      :title="pendingPowerAction === 'shutdown' ? 'Shut down the system?' : 'Reboot the system?'"
      :message="pendingPowerAction === 'shutdown'
        ? 'The device powers off. You need physical access to switch it back on.'
        : 'The device restarts. Playback stops and the web interface is unavailable for about a minute.'"
      :confirm-button-text="pendingPowerAction === 'shutdown' ? 'Shut down' : 'Reboot'"
      cancel-button-text="Cancel"
      :is-dangerous="true"
      icon="power"
      @close="pendingPowerAction = null"
      @confirm="executePowerAction"
    />
  </PageContent>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import Icon from '@/components/Icon.vue'
import PageContent from '@/components/PageContent.vue'
import ConfirmationDialog from '@/components/ConfirmationDialog.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import { useToastStore } from '@/stores/toast'
import { useSettingsStore } from '@/stores/settings'
import { useSupportInfo } from '@/composables/useSupportInfo'
import { rebootSystem, shutdownSystem, detectSoundCard as detectSoundCardAPI, setSoundCardDtoverlay, getSoundCards, setSoundCardDetection, disableSoundCardDetection, getSoundCardDetectionStatus, resetConfigDB } from '@/api/system'
import { stopAllPlayers } from '@/api/player'
import type { SoundCard } from '@/api/system'

// State
const resetting = ref(false)
const detectingSoundCard = ref(false)
const updatingExpertMode = ref(false)
const stoppingPlayers = ref(false)
const showResetConfirmation = ref(false)
const showDetectConfirmation = ref(false)
const showRebootConfirmation = ref(false)
const pendingPowerAction = ref<'reboot' | 'shutdown' | null>(null)
const powerActionRunning = ref(false)
const detectedCardName = ref<string | null>(null)
const detectedDtoverlay = ref<string | null>(null)
const availableSoundCards = ref<SoundCard[]>([])
const selectedSoundCard = ref('')
const savingSoundCard = ref(false)
const loadingSoundCards = ref(false)

// Stores
const toastStore = useToastStore()
const settingsStore = useSettingsStore()
const { getExpertMode } = storeToRefs(settingsStore)
const { report, loading, fetchReport, downloadReport } = useSupportInfo()

// Helper function to transform sound card names
const transformSoundCardName = (name: string): string => {
  const transformations: Record<string, string> = {
    'Beocreate 4-Channel Amplifier': 'Beocreate',
    'DAC+ Zero/Light/MiniAmp': 'DAC+ Zero'
  }
  return transformations[name] || name
}

// Load available sound cards on mount
const loadSoundCards = async () => {
  loadingSoundCards.value = true
  try {
    const response = await getSoundCards()
    if (response.status === 'success' && response.data) {
      availableSoundCards.value = response.data.soundcards

      // Also check if a fixed sound card is configured
      try {
        const detectionStatus = await getSoundCardDetectionStatus()
        if (detectionStatus.status === 'success' && detectionStatus.data) {
          const { detection_disabled, configured_card_name } = detectionStatus.data

          // If detection is disabled and a card is configured, set it as selected
          if (detection_disabled && configured_card_name) {
            // Set the card name directly as the selected value
            selectedSoundCard.value = configured_card_name
          } else if (!detection_disabled) {
            // If detection is enabled, select the auto-detect option
            selectedSoundCard.value = 'auto-detect'
          }
        }
      } catch (detectionErr) {
        console.error('Error loading detection status:', detectionErr)
        // Don't fail the whole operation if detection status fails
      }
    }
  } catch (err) {
    console.error('Error loading sound cards:', err)
    toastStore.showErrorToast('Failed to load available sound cards.')
  } finally {
    loadingSoundCards.value = false
  }
}

// Load sound cards when component mounts
loadSoundCards()

// Methods
const executeReset = async () => {
  showResetConfirmation.value = false
  await resetSystem()
}

const resetSystem = async () => {
  resetting.value = true

  try {
    // Clear the entire configuration database
    await resetConfigDB()

    // Re-enable sound card auto-detection (removes fixed card config)
    await setSoundCardDetection(true)

    toastStore.showInfoToast('System reset complete. The setup wizard will run on next visit.')

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

const saveSoundCardSelection = async () => {
  if (!selectedSoundCard.value) return

  savingSoundCard.value = true
  try {
    // Handle auto-detect option
    if (selectedSoundCard.value === 'auto-detect') {
      // Enable automatic sound card detection
      // This will remove HiFiBerry overlays from config.txt
      await setSoundCardDetection(true)

      toastStore.showSuccessToast('Removed fixed sound card configuration. Auto-detection enabled.')
      showRebootConfirmation.value = true
    } else {
      // Fixed configuration - use the new API endpoint that accepts card name
      // selectedSoundCard.value is already the card name
      const cardName = selectedSoundCard.value

      // Use the proper API endpoint that sets both dtoverlay and disables detection with card name
      const response = await disableSoundCardDetection(cardName)

      if (response.status === 'success') {
        toastStore.showSuccessToast(`${cardName} configured successfully!`)

        if (response.data?.reboot_required) {
          showRebootConfirmation.value = true
        }
      } else {
        throw new Error(response.message || 'Failed to update sound card')
      }
    }
  } catch (err) {
    console.error('Error updating sound card:', err)
    toastStore.showErrorToast(err instanceof Error ? err.message : 'Failed to update sound card')
  } finally {
    savingSoundCard.value = false
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

const executePowerAction = async () => {
  const action = pendingPowerAction.value
  if (!action) return

  pendingPowerAction.value = null
  powerActionRunning.value = true

  const isShutdown = action === 'shutdown'

  try {
    toastStore.showInfoToast(isShutdown ? 'Shutting down...' : 'Rebooting...')
    await (isShutdown ? shutdownSystem() : rebootSystem())
    toastStore.showSuccessToast(
      isShutdown
        ? 'Shutdown initiated. The device powers off shortly.'
        : 'Reboot initiated. The device restarts shortly.'
    )
  } catch (err) {
    console.error(`Error during ${action}:`, err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    toastStore.showErrorToast(
      `Failed to ${isShutdown ? 'shut down' : 'reboot'} the system: ${errorMessage}`
    )
    powerActionRunning.value = false
  }
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

const stopAllMusicPlayers = async () => {
  stoppingPlayers.value = true

  try {
    const success = await stopAllPlayers()

    if (success) {
      toastStore.showSuccessToast('All music players stopped successfully')
    } else {
      toastStore.showErrorToast('Failed to stop all music players')
    }
  } catch (err) {
    console.error('Error stopping all music players:', err)
    toastStore.showErrorToast('Failed to stop all music players')
  } finally {
    stoppingPlayers.value = false
  }
}
</script>

<style scoped lang="scss">
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

      // One accent for all seven cards. Icon.vue's own scoped rule defaults
      // every icon to --color-icon (grey), which left the cards without a
      // per-card override grey and the rest accented - so the page read as
      // if the colour meant something. It did not.
      .tool-icon {
        width: 32px;
        height: 32px;
        flex-shrink: 0;
        color: var(--primary);
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

    // Per-card icon colours removed: .detect-tool and .soundcard-tool were
    // accented, .expert-tool and .report-tool were explicitly grey, and
    // .stop-players-tool matched no element at all (Stop All Players uses
    // .reset-tool), so its warning colour never rendered. The shared
    // .tool-icon rule above now accents all seven alike.

    // .report-tool needs its own row for the fetched report below the
    // icon/description/button row; scoped to this card only so the other
    // five (icon + button, always a single row) keep their layout unchanged
    // at intermediate widths.
    &.report-tool {
      flex-wrap: wrap;
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

      // Every button on this page - Reset, Detect, Stop Players, Save,
      // Create Report, Download - shares one style: the brand --primary,
      // with a real --primary-dark (defined in colors.module.scss) for
      // hover. Reset System and Stop All Players used to be --color-error
      // red, but that token was never actually defined (it rendered via a
      // hardcoded #ef4444 fallback that only coincidentally looked distinct
      // from --primary's #E11E4A), so the two reds were never a real signal,
      // just an inconsistency. Both of those actions already gate on a
      // ConfirmationDialog, so the safety signal lives in that interaction,
      // not in button color - dropping the red here loses no protection.
      .reset-button,
      .detect-button,
      .report-button {
        background: var(--primary);

        &:hover:not(:disabled) {
          background: var(--primary-dark, var(--primary));
        }
      }

      &.power-actions {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      &.soundcard-actions {
        display: flex;
        gap: 12px;
        align-items: center;

        .soundcard-select {
          padding: 10px 16px;
          border: 1px solid var(--color-sidebar-border);
          border-radius: 6px;
          background: var(--background-card);
          color: var(--color-body-secondary);
          font-size: 0.9rem;
          font-family: inherit;
          cursor: pointer;
          min-width: 250px;

          &:focus {
            outline: none;
            border-color: var(--primary);
            color: var(--color-head);
            box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
          }

          &:hover:not(:disabled) {
            border-color: var(--color-head);
            color: var(--color-head);
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }

        // Padding, border-radius, color, cursor, weight, size, transition
        // and :disabled all now come from the shared `.tool-actions button`
        // rule above - Save no longer carries its own (larger, more
        // rounded) geometry, so all six buttons on the page match exactly.
        .save-button {
          background: var(--primary);

          &:hover:not(:disabled) {
            background: var(--primary-dark, var(--primary));
          }
        }
      }
    }

    .expert-toggle {
    }

    // Rendered report lives inside .tool-card (see template) so its
    // "Download as file" button falls under the .tool-actions button rules
    // above instead of picking up the unstyled global button reset. Forced
    // onto its own row below the icon/description/button row via flex-basis
    // on the wrapping (&.report-tool: flex-wrap: wrap above) .tool-card.
    // width: 100% is explicit too: under the <=768px media query below,
    // .tool-card switches to flex-direction: column, at which point
    // flex-basis sets a height, not a width, and this would otherwise be
    // shrink-to-fit.
    .support-report {
      flex-basis: 100%;
      width: 100%;
      margin-top: 1rem;
    }
  }
}

.support-report-text {
  max-height: 24rem;
  overflow: auto;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: rgba(0, 0, 0, 0.25);
  font-family: monospace;
  font-size: 0.8rem;
  white-space: pre;
  user-select: text;
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

          &.soundcard-actions {
            flex-direction: column;
            gap: 12px;

            .soundcard-select {
              width: 100%;
              min-width: unset;
            }

            .save-button {
              width: 100%;
            }
          }
        }
      }
    }
  }
}
</style>
