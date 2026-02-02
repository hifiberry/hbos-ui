<template>
  <PageContent title="General sound settings" :backrouterLink="{ name: 'sound' }" class="settings">
    <div class="settings-overview">
      <div class="service-card">
        <div class="setting-item">
          <div class="setting-header">
            <div class="setting-label">
              <Icon icon="tabler/volume" class="setting-icon" />
              <div class="setting-title">
                <h3>Volume limit</h3>
              </div>
            </div>
            <div class="setting-progress">
              <ProgressSlider
                :value="volumeLimitPercent"
                :min="0"
                :max="100"
                :step="1"
                :disabled="!volumeAvailable"
                :has-thumb="true"
                :is-draggable="true"
                :is-on-header="false"
                @click:progress="onSliderChange"
              />
            </div>
            <div class="setting-value">
              <span class="percent">{{ volumeLimitPercent }}%</span>
              <span class="db">{{ displayDb }}</span>
            </div>
          </div>
        </div>

        <div class="setting-item" :title="headphoneVolumeAvailable ? `Headphone volume control: ${headphoneVolumeControlType}` : 'Your sound card doesn\'t support headphones'">
          <div class="setting-header">
            <div class="setting-label">
              <Icon icon="tabler/headphones" class="setting-icon" />
              <div class="setting-title">
                <h3>Headphone volume</h3>
              </div>
            </div>
            <div class="setting-progress">
              <ProgressSlider
                :value="headphoneVolumePercent"
                :min="0"
                :max="100"
                :step="1"
                :disabled="!headphoneVolumeAvailable"
                :has-thumb="headphoneVolumeAvailable"
                :is-draggable="headphoneVolumeAvailable"
                :is-on-header="false"
                @click:progress="onHeadphoneSliderChange"
              />
            </div>
            <div class="setting-value">
              <span v-if="headphoneVolumeAvailable" class="percent">{{ headphoneVolumePercent }}%</span>
              <span v-if="headphoneVolumeAvailable" class="db">{{ headphoneDisplayDb }}</span>
            </div>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-header">
            <div class="setting-label">
              <Icon icon="tabler/caret-left-right" class="setting-icon" />
              <div class="setting-title">
                <h3>Balance</h3>
              </div>
            </div>
            <div class="setting-progress">
              <ProgressSlider
                :value="balanceSliderPercent"
                :min="0"
                :max="100"
                :step="1"
                :disabled="!balanceAvailable"
                :has-thumb="true"
                :is-draggable="true"
                :is-on-header="false"
                :center-mark="50"
                @click:progress="onBalanceChange"
              />
            </div>
            <div class="setting-value">
              <span class="percent">{{ balanceLabel }}</span>
            </div>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-header">
            <div class="setting-label">
              <Icon icon="tabler/speaker" class="setting-icon" />
              <div class="setting-title">
                <h3>Mode</h3>
              </div>
            </div>
            <div class="setting-control">
              <div class="mode-button-bar">
                <button
                  :class="['mode-btn', { active: audioMode === 'stereo' }]"
                  :disabled="!modeAvailable"
                  title="Standard stereo (L→L, R→R)"
                  @click="setAudioMode('stereo')"
                >
                  Stereo
                </button>
                <button
                  :class="['mode-btn', { active: audioMode === 'swapped' }]"
                  :disabled="!modeAvailable"
                  title="Swap left/right channels (L→R, R→L)"
                  @click="setAudioMode('swapped')"
                >
                  Swapped
                </button>
                <button
                  :class="['mode-btn', { active: audioMode === 'mono' }]"
                  :disabled="!modeAvailable"
                  title="Mix L+R channels equally to both outputs"
                  @click="setAudioMode('mono')"
                >
                  Mono
                </button>
                <button
                  :class="['mode-btn', { active: audioMode === 'left' }]"
                  :disabled="!modeAvailable"
                  title="Send left channel to both outputs"
                  @click="setAudioMode('left')"
                >
                  Left
                </button>
                <button
                  :class="['mode-btn', { active: audioMode === 'right' }]"
                  :disabled="!modeAvailable"
                  title="Send right channel to both outputs"
                  @click="setAudioMode('right')"
                >
                  Right
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageContent>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon.vue'
import PageContent from '@/components/PageContent.vue'
import ProgressSlider from '@/components/ProgressSlider.vue'
import { ref, computed, onMounted } from 'vue'
import { getSpeakerEQCrossbar, setSpeakerEQCrossbarMatrix } from '@/api/pipewire'
import { getSystemInfo, type SystemInfo } from '@/api/system'
import { getHeadphoneControls, getHeadphoneVolume, setHeadphoneVolume } from '@/api/volume'
import { settingsToMatrix, matrixToSettings, type AudioMode } from '@/helpers/mixing_matrix'

// Local UI state for volume limit (0-100%)
const volumeLimitPercent = ref<number>(100)
const volumeLimitDb = ref<number | null>(null)
const volumeAvailable = ref<boolean>(true)

// Headphone volume control state
const headphoneVolumePercent = ref<number>(100)
const headphoneVolumeDb = ref<number | null>(null)
const headphoneVolumeAvailable = ref<boolean>(false)
const headphoneVolumeControlType = ref<string | null>(null)
const systemInfo = ref<SystemInfo | null>(null)

// Convert percentage to attenuation in dB (0% => -∞ dB, otherwise 20*log10(p))
const displayDb = computed(() => {
  if (volumeLimitDb.value === null) {
    const p = volumeLimitPercent.value / 100
    if (p <= 0) return '- ∞ dB'
    const db = 20 * Math.log10(p)
    const rounded = Math.round(db * 10) / 10 // 0.1 dB precision
    return `${rounded.toFixed(1)} dB`
  }
  const rounded = Math.round(volumeLimitDb.value * 10) / 10
  return `${rounded.toFixed(1)} dB`
})

// Convert percentage to attenuation in dB for headphone volume
const headphoneDisplayDb = computed(() => {
  if (headphoneVolumeDb.value === null) {
    const p = headphoneVolumePercent.value / 100
    if (p <= 0) return '- ∞ dB'
    const db = 20 * Math.log10(p)
    const rounded = Math.round(db * 10) / 10 // 0.1 dB precision
    return `${rounded.toFixed(1)} dB`
  }
  const rounded = Math.round(headphoneVolumeDb.value * 10) / 10
  return `${rounded.toFixed(1)} dB`
})

// Update local state when the slider changes (click or drag end)
async function onSliderChange(newVal: number) {
  const pct = Math.round(newVal)
  volumeLimitPercent.value = pct
  // TODO: Re-implement with new PipeWire API
  /*
  // PipeWire expects linear 0.0-1.0; API handles curve conversion and returns dB
  try {
    const linear = Math.max(0, Math.min(1, pct / 100))
    const res = await setPipewireVolume('default', { volume: linear })
    if (res.status === 'success' && res.data) {
      // Reflect authoritative values from backend
      const data = res.data as PipewireVolumeData
      volumeLimitPercent.value = Math.round((data.volume ?? linear) * 100)
      volumeLimitDb.value = data.volume_db
      volumeAvailable.value = true
    }
  } catch (e) {
    console.error('Failed to set PipeWire default volume:', e)
    volumeAvailable.value = false
  }
  */
}

// Update headphone volume when the slider changes
async function onHeadphoneSliderChange(newVal: number) {
  if (!headphoneVolumeAvailable.value) {
    console.warn('Headphone volume control not available')
    return
  }

  const pct = Math.round(newVal)
  headphoneVolumePercent.value = pct

  try {
    console.log('Setting headphone volume to:', pct, '%')
    const res = await setHeadphoneVolume(pct)

    if (res.status === 'success') {
      if (res.data?.volume !== undefined) {
        headphoneVolumePercent.value = res.data.volume
      }
      console.log('Headphone volume successfully set to:', headphoneVolumePercent.value, '%')
    } else {
      console.error('Failed to set headphone volume:', res.message)
      // You might want to revert the UI value or show an error message
    }
  } catch (e) {
    console.error('Error setting headphone volume:', e)
    // You might want to revert the UI value or show an error message
  }
}

// Balance state - connected to PipeWire mixer (-1 to +1 scale)
const balanceValue = ref<number>(0) // -1 (full left) to +1 (full right), 0 = center, always a valid number
const balanceAvailable = ref<boolean>(true)

// Convert PipeWire balance (-1 to +1) to slider percentage for ProgressSlider (0-100)
const balanceToSliderPercent = (balance: number): number => {
  // Handle invalid balance values
  if (typeof balance !== 'number' || isNaN(balance)) {
    return 50 // Default to center (50%) if balance is invalid
  }
  // -1 -> 0%, 0 -> 50%, +1 -> 100%
  return (balance + 1) * 50
}

// Convert slider percentage (0-100) to PipeWire balance (-1 to +1)
const sliderPercentToBalance = (percent: number): number => {
  // Handle invalid input
  if (typeof percent !== 'number' || isNaN(percent) || !isFinite(percent)) {
    console.error('Invalid percent input to sliderPercentToBalance:', percent)
    return 0 // Default to center balance
  }
  // 0% -> -1, 50% -> 0, 100% -> +1
  return (percent / 50) - 1
}

// UI display value for the slider
const balanceSliderPercent = computed(() => balanceToSliderPercent(balanceValue.value))

// Human-readable label: Left/Right/Center with bias amount
const balanceLabel = computed(() => {
  const balance = balanceValue.value

  // Handle invalid balance values
  if (typeof balance !== 'number' || isNaN(balance)) {
    return 'Center' // Default to center if balance is invalid
  }

  if (Math.abs(balance) < 0.01) return 'Center' // Show center only when within 1%
  const percentage = Math.round(Math.abs(balance) * 100)
  return balance < 0 ? `${percentage}% Left` : `${percentage}% Right`
})

// Audio mode state
const audioMode = ref<AudioMode>('stereo')
const modeAvailable = ref<boolean>(true)

async function setAudioMode(mode: AudioMode) {
  console.log('=== setAudioMode START ===')
  console.log('Setting audio mode to:', mode)
  console.log('Current balance value:', balanceValue.value)

  try {
    // Convert mode and balance to mixing matrix
    const matrix = settingsToMatrix(mode, balanceValue.value)
    console.log('Calculated matrix from mode/balance:', {
      mode,
      balance: balanceValue.value,
      matrix
    })

    // Update the matrix in PipeWire using the new bulk API
    console.log('Setting crossbar matrix...')
    const result = await setSpeakerEQCrossbarMatrix(matrix)

    if ('error' in result) {
      console.error('Failed to set crossbar matrix:', result.error, result.message)
      modeAvailable.value = false
      return
    }

    console.log('Crossbar matrix updated successfully:', result.matrix)

    // Update local state
    audioMode.value = mode
    modeAvailable.value = true
    console.log('Audio mode successfully changed to:', mode)
  } catch (e) {
    console.error('Failed to set PipeWire audio mode:', e)
    modeAvailable.value = false
  }
  console.log('=== setAudioMode END ===')
}

async function onBalanceChange(newVal: number) {
  console.log('=== onBalanceChange START ===')
  console.log('Slider value:', newVal)

  const balance = sliderPercentToBalance(newVal)
  console.log('Calculated balance from slider:', balance)

  if (typeof balance === 'number' && !isNaN(balance) && isFinite(balance)) {
    balanceValue.value = Math.round(balance * 100) / 100
    console.log('Set local balance to:', balanceValue.value)
  } else {
    console.error('Invalid balance calculated from slider:', balance, 'from input:', newVal)
    return
  }

  try {
    // Convert mode and balance to mixing matrix
    const matrix = settingsToMatrix(audioMode.value, balanceValue.value)
    console.log('Calculated matrix from mode/balance:', {
      mode: audioMode.value,
      balance: balanceValue.value,
      matrix
    })

    // Update the matrix in PipeWire using the new bulk API
    console.log('Setting crossbar matrix...')
    const result = await setSpeakerEQCrossbarMatrix(matrix)

    if ('error' in result) {
      console.error('Failed to set crossbar matrix:', result.error, result.message)
      balanceAvailable.value = false
      return
    }

    console.log('Crossbar matrix updated successfully:', result.matrix)

    balanceAvailable.value = true
  } catch (e) {
    console.error('Failed to set PipeWire balance:', e)
    balanceAvailable.value = false
  }
  console.log('=== onBalanceChange END ===')
}

// Initialize from default sink volume and balance
onMounted(async () => {
  // Check for headphone volume control support using the API
  try {
    console.log('Checking for headphone volume controls...')
    const controlsRes = await getHeadphoneControls()

    if (controlsRes.status === 'success' && controlsRes.data) {
      const hasHeadphoneControls = controlsRes.data.count > 0
      headphoneVolumeAvailable.value = hasHeadphoneControls

      if (hasHeadphoneControls) {
        headphoneVolumeControlType.value = controlsRes.data.controls[0] // Use first available control
        console.log('Headphone volume controls found:', controlsRes.data.controls)

        // Load current headphone volume
        try {
          const volumeRes = await getHeadphoneVolume()
          if (volumeRes.status === 'success' && volumeRes.data) {
            headphoneVolumePercent.value = volumeRes.data.volume
            console.log('Current headphone volume:', volumeRes.data.volume, '%')
          }
        } catch (e) {
          console.warn('Failed to load current headphone volume:', e)
        }
      } else {
        console.log('No headphone volume controls available')
      }
    } else {
      console.log('Failed to check headphone controls:', controlsRes.message)
      headphoneVolumeAvailable.value = false
    }
  } catch (e) {
    console.warn('Failed to check headphone volume controls:', e)
    headphoneVolumeAvailable.value = false
  }

  // Load system info for other information
  try {
    const sysRes = await getSystemInfo()
    if (sysRes.status === 'success') {
      systemInfo.value = sysRes
    }
  } catch (e) {
    console.warn('Failed to load system info:', e)
  }

  // TODO: Re-implement with new PipeWire API
  /*
  // Load volume
  try {
    const res = await getPipewireVolume('default')
    if (res.status === 'success' && res.data) {
      const data = res.data as PipewireVolumeData
      volumeLimitPercent.value = Math.round((data.volume ?? 1) * 100)
      volumeLimitDb.value = data.volume_db
      volumeAvailable.value = true
    }
  } catch (e) {
    console.warn('PipeWire volume not available:', e)
    volumeAvailable.value = false
  }
  */

  // Load mixing matrix from PipeWire API
  try {
    console.log('Loading mixing matrix from PipeWire...')
    const res = await getSpeakerEQCrossbar()

    if ('error' in res) {
      console.warn('Failed to get crossbar matrix:', res.error, res.message)
      balanceAvailable.value = false
      modeAvailable.value = false
    } else {
      const matrix = res.matrix
      console.log('Loaded crossbar matrix from API:', matrix)

      // Convert matrix to mode and balance settings
      const settings = matrixToSettings(matrix)

      if (settings) {
        console.log('Extracted settings from matrix:', settings)
        audioMode.value = settings.mode
        balanceValue.value = Math.round(settings.balance * 100) / 100
        console.log('Initialized audio mode to:', audioMode.value)
        console.log('Initialized balance to:', balanceValue.value)
        balanceAvailable.value = true
        modeAvailable.value = true
      } else {
        console.warn('Could not extract settings from matrix, using defaults')
        audioMode.value = 'stereo'
        balanceValue.value = 0
        balanceAvailable.value = true
        modeAvailable.value = true
      }
    }
  } catch (e) {
    console.warn('PipeWire balance/mode not available:', e)
    balanceAvailable.value = false
    modeAvailable.value = false
  }
})
</script>

<style scoped lang="scss">
h1 { margin-bottom: 32px; color: var(--color-head); }
.settings-overview {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;
  .service-card {
    display: block; background: var(--background-card); border-radius: 8px; padding: 24px; border: 1px solid var(--color-border);
    .service-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .service-icon { width: 24px; height: 24px; color: var(--color-primary); }
    h2 { margin: 0; color: var(--color-head); font-size: 1.25rem; }
    .service-description { color: var(--color-body-secondary); line-height: 1.5; }

    .setting-item {
      margin-top: 0;
      padding-top: 10px;
      border-top: none;

    /* add spacing only between subsequent settings */
    & + .setting-item {
      margin-top: 15px;
    }
      .setting-header {
        display: grid;
        grid-template-columns: 260px 1fr 200px; /* label | slider | value */
        align-items: center;
        column-gap: 16px;
        margin-bottom: 10px;

        .setting-label {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0; /* allow text to ellipsize if needed */
        }

        .setting-icon {
          width: 40px;
          height: 40px;
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .setting-icon :deep(svg) {
          width: 28px;
          height: 28px;
          object-fit: contain;
          stroke-width: 1px;
        }

        .setting-title {
          display: flex;
          flex-direction: column;
          gap: 2px;
          h3 { margin: 0; font-size: 1.125rem; font-weight: 600; color: var(--color-head); }
          .muted { color: var(--color-body-secondary); }
        }

        .setting-progress {
          display: flex;
          align-items: center;
          min-width: 180px;
          gap: 8px;
        }

        .setting-value {
          justify-self: end;
          display: flex;
          gap: 10px;
          align-items: baseline;
          .percent { font-weight: 600; color: var(--color-head); }
          .db { color: var(--color-body-secondary); }
        }
      }

      .setting-control {
        input[type='range'] {
          width: 100%;
        }

        .mode-button-bar {
          display: flex;
          flex-wrap: nowrap;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--color-border);

          .mode-btn {
            flex: 1;
            padding: 12px 16px;
            cursor: pointer;
            font-family: 'Metropolis', sans-serif;
            font-size: 14px;
            font-weight: 500;
            border: none;
            border-right: 1px solid var(--color-border);
            transition: all 0.2s ease-in-out;
            background-color: transparent;
            color: var(--color-body, #707070);

            &:last-child {
              border-right: none;
            }

            &.active {
              background: var(--color-primary, #e11e4a);
              color: white;
            }

            &:hover:not(:disabled):not(.active) {
              background: var(--background-button-secondary-hover, rgba(225, 30, 74, 0.1));
              color: var(--color-primary, #e11e4a);
            }

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          }
        }
      }
    }
  }
}

/* Responsive: stack into one column on small screens */
@media (max-width: 800px) {
  .settings {
    .settings-overview { grid-template-columns: 1fr; }
    .settings-overview .service-card .setting-item .setting-header {
          /* Force vertical stacking on small screens */
      display: flex !important;
          flex-direction: column;
          align-items: stretch;
          gap: 8px;
    }
    .settings-overview .service-card .setting-item .setting-header .setting-label { align-items: center; }
    .settings-overview .service-card .setting-item .setting-header .setting-progress {
      min-width: 0;
    }
    .settings-overview .service-card .setting-item .setting-header .setting-progress :deep(.app-progress-slider) { width: 100%; }
    .settings-overview .service-card .setting-item .setting-header .setting-value { align-self: flex-start; }
  }
}
</style>
