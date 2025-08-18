<template>
  <div v-if="isOpen" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Room Measurement Wizard</h2>
        <button @click="closeWizard" class="close-button" title="Close">
          <AppIcon icon="close" />
        </button>
      </div>

      <div class="modal-body">
        <!-- Step 1: Microphone Detection -->
        <div v-if="currentStep === 1" class="step-content">
          <div class="step-header">
            <AppIcon icon="tabler/microphone" class="step-icon" />
            <div class="step-info">
              <h3>Step 1: Microphone Detection</h3>
              <p>Detecting available microphones for room measurement...</p>
            </div>
          </div>

          <div class="measurement-mic-image">
            <img src="/images/measurement-mic.png" alt="Measurement Microphone" />
          </div>

          <div v-if="loadingMicrophones" class="loading-section">
            <div class="spinner"></div>
            <p>Searching for microphones...</p>
          </div>

          <div v-else-if="microphoneError" class="error-section">
            <AppIcon icon="tabler/alert-circle" class="error-icon" />
            <p class="error-message">{{ microphoneError }}</p>
            <button @click="detectMicrophones" class="retry-button">
              <AppIcon icon="refresh" />
              Retry Detection
            </button>
          </div>

          <div v-else-if="detectedMicrophones.length === 0" class="empty-section">
            <AppIcon icon="tabler/microphone-off" class="empty-icon" />
            <h4>No Microphones Detected</h4>
            <p>Please connect a USB microphone or ensure your microphone is properly configured.</p>
            <button @click="detectMicrophones" class="retry-button">
              <AppIcon icon="refresh" />
              Check Again
            </button>
          </div>

          <div v-else class="microphones-section">
            <h4>Found {{ detectedMicrophones.length }} microphone{{ detectedMicrophones.length !== 1 ? 's' : '' }}:</h4>
            <div class="microphones-list">
              <div
                v-for="microphone in detectedMicrophones"
                :key="microphone.card_index"
                class="microphone-item"
                :class="{ selected: selectedMicrophone?.card_index === microphone.card_index }"
                @click="selectMicrophone(microphone)"
              >
                <div class="microphone-info">
                  <AppIcon icon="tabler/microphone" class="microphone-icon" />
                  <div class="microphone-details">
                    <h5>{{ microphone.device_name }}</h5>
                    <p class="microphone-specs">
                      <span class="spec-item">Card: {{ microphone.card_index }}</span>
                      <span class="spec-item">Sensitivity: {{ microphone.sensitivity_str }} dB</span>
                      <span class="spec-item">Gain: {{ microphone.gain_db }} dB</span>
                    </p>
                  </div>
                </div>
                <div class="microphone-select">
                  <AppIcon v-if="selectedMicrophone?.card_index === microphone.card_index" icon="checkmark" class="check-icon" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Microphone Positioning -->
        <div v-if="currentStep === 2" class="step-content">
          <div class="step-header">
            <AppIcon icon="tabler/target" class="step-icon" />
            <div class="step-info">
              <h3>Step 2: Microphone Positioning</h3>
              <p>Position your measurement microphone at your listening position pointing upwards.</p>
            </div>
          </div>

          <div class="measurement-mic-image">
            <img src="/images/measurement-mic-upright.png" alt="Microphone Positioning - Upright at Listening Position" />
          </div>

          <div class="positioning-instructions">
            <p>
              Place the microphone at your listening position with the capsule pointing upward.
              Ensure it's stable and positioned exactly where your head would be when listening to music.
            </p>
          </div>
        </div>

        <!-- Step 3: Audio Level -->
        <div v-if="currentStep === 3" class="step-content">
          <div class="step-header">
            <AppIcon icon="tabler/volume-2" class="step-icon" />
            <div class="step-info">
              <h3>Step 3: Audio Level</h3>
              <p>Adjust your audio system to the appropriate level for room measurement.</p>
            </div>
          </div>

          <div class="audio-level-instructions">
            <div class="level-guidance">
              <h4>Volume Guidelines:</h4>
              <p>Set your amplifier to normal listening volume. The measurement uses white noise at controlled levels. Ensure the room is quiet with doors and windows closed to minimize background noise. Start with moderate volume levels to protect your hearing and equipment.</p>
            </div>

            <div class="noise-controls" data-component="room-wizard">
              <h4 :style="{ marginTop: '10px', marginBottom: '10px' }">Test Audio Level:</h4>
              <div class="controls-section">
                <div class="noise-button-container">
                  <button
                    @click="toggleNoise"
                    :class="['nav-button', isNoiseePlaying ? 'danger' : 'primary']"
                  >
                    <AppIcon :icon="isNoiseePlaying ? 'tabler/player-stop' : 'tabler/player-play'" />
                    {{ isNoiseePlaying ? 'Stop Noise' : 'Play Noise' }}
                  </button>
                </div>

                <div class="volume-control">
                  <div class="volume-header" :style="{ marginTop: '10px', marginBottom: '10px' }">
                    <span class="volume-label">Volume</span>
                  </div>
                  <div class="volume-slider-container">
                    <AppProgressSlider
                      :value="displayVolume"
                      :min="0"
                      :max="100"
                      :step="1"
                      :disabled="false"
                      :has-thumb="true"
                      :is-draggable="true"
                      :is-on-header="false"
                      @click:progress="updateSystemVolume"
                    />
                  </div>
                </div>

                <div class="measured-level-control">
                  <div class="measured-level-header" :style="{ marginTop: '10px', marginBottom: '10px' }">
                    <span class="measured-level-label">Measured level</span>
                    <span class="measured-level-value">{{ currentSPL.toFixed(1) }}dB</span>
                  </div>
                  <div class="measured-level-meter-container">
                    <div class="vu-meter">
                      <div class="spl-meter-bar">
                        <div class="spl-meter-track">
                          <div
                            class="spl-meter-fill"
                            :style="{
                              width: `${getSPLPercentage(currentSPL)}%`,
                              backgroundColor: getSPLColor(currentSPL)
                            }"
                          ></div>
                        </div>
                        <div class="spl-scale">
                          <span
                            v-for="tick in splTicks"
                            :key="tick"
                            class="scale-mark"
                            :class="{ optimal: tick >= 70 && tick <= 90 }"
                            :style="{ left: `${getSPLPercentage(tick)}%` }"
                          >{{ tick }}</span>
                        </div>
                      </div>
                      <div class="optimal-range-indicator">
                        <span class="range-label">Optimal: 70-90dB</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: Measure Room -->
        <div v-if="currentStep === 4" class="step-content">
          <div class="step-header">
            <AppIcon icon="tabler/wave-sine" class="step-icon" />
            <div class="step-info">
              <h3>Step 4: Measure Room</h3>
              <p>Select the number of sweeps and start the measurement. We'll play test signals and capture data.</p>
            </div>
          </div>

          <div class="measure-settings">
            <div v-if="isExpertMode" class="setting-row">
              <label class="setting-label">Signal Type</label>
              <div class="signal-type-options">
                <div
                  v-for="option in availableSignalTypes"
                  :key="option.value"
                  class="signal-option"
                  :class="{ active: signalType === option.value, disabled: isMeasuringRoom }"
                  @click="
                    !isMeasuringRoom && (
                      signalType = option.value as 'sine_sweep' | 'sox_sine_sweep' | 'white_noise',
                      step4Error = ''
                    )
                  "
                >
                  <div class="signal-option-header">
                    <AppIcon :icon="option.icon" />
                    <span class="signal-option-label">{{ option.label }}</span>
                  </div>
                  <div class="signal-option-description">{{ option.description }}</div>
                </div>
              </div>
              <div v-if="step4Error" class="setting-error">{{ step4Error }}</div>
            </div>

            <div class="setting-row" v-if="signalType === 'sine_sweep' || signalType === 'sox_sine_sweep'">
              <label class="setting-label">Number of sweeps</label>
              <div class="segmented">
                <button
                  v-for="n in sweepOptions"
                  :key="n"
                  type="button"
                  class="segmented-btn"
                  :class="{ active: sweepCount === n }"
                  :disabled="isMeasuringRoom"
                  @click="sweepCount = n"
                >{{ n }}</button>
              </div>
            </div>
          </div>

          <div class="measure-actions">
            <button
              class="nav-button primary"
              :disabled="isMeasuringRoom || !signalType"
              @click="startRoomMeasurement"
            >
              <AppIcon icon="tabler/player-play" />
              {{ isMeasuringRoom ? 'Measuring…' : 'Start measurement' }}
            </button>
          </div>
          <div v-if="recordingFilename && isExpertMode" class="recording-file">
            <AppIcon icon="tabler/file-music" />
            Recording file: <span class="mono">{{ recordingFilename }}</span>
          </div>

          <div v-if="isMeasuringRoom" class="progress-info">
            <div class="progress-text" v-if="signalType === 'sine_sweep' || signalType === 'sox_sine_sweep'">
              Sweep {{ currentSweepIndex + 1 }} of {{ sweepCount }}
            </div>
            <div class="progress-text" v-else>
              Playing white noise signal...
            </div>
            <div class="progress-bar" v-if="signalType === 'sine_sweep' || signalType === 'sox_sine_sweep'">
              <div class="fill" :style="{ width: `${Math.min(100, Math.max(0, ((currentSweepIndex + 1) / sweepCount) * 100))}%` }"></div>
            </div>
          </div>
        </div>

        <!-- Step 5: Save Measurement -->
        <div v-if="currentStep === 5" class="step-content">
          <div class="step-header">
            <AppIcon icon="tabler/device-floppy" class="step-icon" />
            <div class="step-info">
              <h3>Step 5: Save Measurement</h3>
              <p>Your room measurement has been recorded and is ready to be used.</p>
            </div>
          </div>

          <!-- Measurement Name Input -->
          <div class="measurement-name-section">
            <div class="name-input-group">
              <label for="measurementName">Measurement Name:</label>
              <input
                id="measurementName"
                v-model="measurementName"
                type="text"
                class="measurement-name-input"
                placeholder="Enter measurement name"
              />
            </div>
          </div>

          <!-- FFT Analysis Results -->
          <div class="fft-analysis">
            <div class="analysis-header">
              <h4>Frequency Response</h4>
              <div v-if="shouldShowSmoothingSelector" class="smoothing-selection">
                <label for="smoothingType">Smoothing:</label>
                <select id="smoothingType" v-model="smoothingType" class="smoothing-dropdown">
                  <option value="1/3_octave">1/3 Octave</option>
                  <option value="1/6_octave">1/6 Octave</option>
                  <option value="psychoacoustic">Psychoacoustic</option>
                </select>
              </div>
            </div>
            <div v-if="isAnalyzingFFT" class="fft-loading">
              <AppIcon icon="tabler/loader-2" class="fft-loading-icon" />
              <span>Analyzing frequency response...</span>
            </div>
            <div v-else-if="fftError" class="fft-error">
              <AppIcon icon="tabler/alert-circle" />
              <span>Error: {{ fftError }}</span>
            </div>
            <div v-else-if="fftData" class="fft-chart">
              <div class="frequency-response-chart">
                <svg viewBox="0 0 800 300" class="response-svg">
                  <!-- Grid lines -->
                  <defs>
                    <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#444" stroke-width="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="800" height="300" fill="url(#grid)" />

                  <!-- Frequency axis (log scale) -->
                  <g class="frequency-axis">
                    <text x="50" y="290" text-anchor="middle" class="axis-label">20</text>
                    <text x="200" y="290" text-anchor="middle" class="axis-label">100</text>
                    <text x="400" y="290" text-anchor="middle" class="axis-label">1k</text>
                    <text x="600" y="290" text-anchor="middle" class="axis-label">10k</text>
                    <text x="750" y="290" text-anchor="middle" class="axis-label">20k</text>
                  </g>

                  <!-- Magnitude axis -->
                  <g class="magnitude-axis">
                    <text x="20" y="250" text-anchor="middle" class="axis-label">-20</text>
                    <text x="20" y="150" text-anchor="middle" class="axis-label">0</text>
                    <text x="20" y="50" text-anchor="middle" class="axis-label">+20</text>
                  </g>

                  <!-- Frequency response curve -->
                  <path
                    :d="generateFrequencyResponsePath(fftData)"
                    fill="none"
                    stroke="#4CAF50"
                    stroke-width="2"
                  />

                  <!-- 0 dB reference line -->
                  <line x1="40" y1="150" x2="760" y2="150" stroke="#666" stroke-width="1" stroke-dasharray="5,5"/>
                </svg>
              </div>

              <!-- Frequency bands summary -->
              <!-- <div class="frequency-bands">
                <div v-for="(band, key) in fftData.frequency_bands" :key="key" class="band-info">
                  <span class="band-name">{{ getBandDisplayName(key) }}</span>
                  <span class="band-range">{{ band.range }}</span>
                  <span class="band-level">{{ band.avg_magnitude.toFixed(1) }}dB</span>
                </div>
              </div> -->
            </div>
          </div>
        </div>

      </div>

      <div class="modal-footer">
        <div class="step-navigation">
          <button v-if="currentStep > 1" @click="previousStep" class="nav-button secondary">
            <AppIcon icon="arrow-left" />
            Previous
          </button>
          <div class="step-indicator">
            Step {{ currentStep }} of {{ totalSteps }}
          </div>
          <button
            v-if="canProceedToNextStep && currentStep < totalSteps"
            @click="nextStep"
            class="nav-button primary"
            :disabled="!canProceedToNextStep"
          >
            Next
            <AppIcon icon="arrow-right" />
          </button>
          <button v-else-if="currentStep === totalSteps" @click="saveMeasurement" class="nav-button primary">
            Save
            <AppIcon icon="checkmark" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import AppIcon from './app-icon.vue'
import AppProgressSlider from './app-progress-slider.vue'
import { measureRoomEQSPL, getRoomEQMicrophones, type RoomEQMicrophone, startRoomEQNoise, stopRoomEQNoise, keepRoomEQNoisePlaying, startRoomEQSweep, startRoomEQSweepSox, startRoomEQRecording, analyzeRoomEQFFTRecording } from '@/api/roomeq'
import { pauseAllPlayers } from '@/api/player'
import { usePlayerStore } from '@/stores/player'
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'

// Props
interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  close: []
  measurementCompleted: []
}>()

// Stores
const playerStore = usePlayerStore()
const settingsStore = useSettingsStore()
const { currentVolume } = storeToRefs(playerStore)
const { getExpertMode } = storeToRefs(settingsStore)

// Expert mode computed properties
const isExpertMode = computed(() => getExpertMode.value)
const availableSignalTypes = computed(() => {
  if (isExpertMode.value) {
    return signalTypeOptions
  } else {
    // In non-expert mode, only show built-in sweep
    return signalTypeOptions.filter(option => option.value === 'sine_sweep')
  }
})

const shouldShowSmoothingSelector = computed(() => isExpertMode.value)

// State
const currentStep = ref(1)
const totalSteps = ref(5) // 1: Microphone, 2: Positioning, 3: Audio Level, 4: Measure Room, 5: Save
const loadingMicrophones = ref(false)
const microphoneError = ref('')
const detectedMicrophones = ref<RoomEQMicrophone[]>([])
const selectedMicrophone = ref<RoomEQMicrophone | null>(null)

// Audio level step state
const noiseAmplitude = ref(1.0) // Maximum amplitude for noise
const isNoiseePlaying = ref(false)
const keepAliveInterval = ref<number | null>(null)

// Computed
const canProceedToNextStep = computed(() => {
  if (currentStep.value === 1) {
    return selectedMicrophone.value !== null
  }
  if (currentStep.value === 2) {
    return true // User can proceed after reading positioning instructions
  }
  if (currentStep.value === 3) {
    return true // User can proceed after reading audio level instructions
  }
  if (currentStep.value === 4) {
    // Disable navigation while measuring or if no measurement has been completed
    return !isMeasuringRoom.value && recordingFilename.value !== ''
  }
  if (currentStep.value === 5) {
    return true // User can proceed after viewing measurement results
  }
  return true
})

const displayVolume = computed(() => {
  return Math.round(currentVolume.value)
})

// Dummy audio context and source for the VU meter display (will be replaced with real audio measurement later)
const dummyAudioContext = ref<AudioContext | null>(null)
const dummyAudioSource = ref<AudioNode | null>(null)

// SPL Measurement
const currentSPL = ref(-80) // Start with a low baseline
const isMeasuring = ref(false)
const isMeasuringSPL = ref(false) // Flag to prevent concurrent SPL API calls

// Step 4: Room measurement state
const sweepOptions = [1, 2, 4]
const sweepCount = ref<number>(2)
const signalTypeOptions = [
  { value: 'sine_sweep', label: 'Built-in Sweep', icon: 'tabler/wave-sine', description: 'Logarithmic frequency sweep (recommended for room analysis)' },
  { value: 'sox_sine_sweep', label: 'SoX Sine Sweep', icon: 'tabler/wave-sine', description: 'SoX-generated logarithmic sweep (alternative generator)' },
  { value: 'white_noise', label: 'White Noise', icon: 'tabler/volume', description: 'Broadband noise signal (good for quick measurements)' }
]
const signalType = ref<'sine_sweep' | 'sox_sine_sweep' | 'white_noise' | null>(null)
const isMeasuringRoom = ref(false)
const currentSweepIndex = ref(0)
const sweepStatusInterval = ref<number | null>(null)
const totalSweepDuration = ref<number | null>(null)
const recordingId = ref<string | number | null>(null)
const recordingFilename = ref<string>('')
const step4Error = ref<string>('')

// FFT analysis state
// FFT analysis state
interface FFTData {
  frequencies: number[]
  magnitude: number[]
  phase: number[]
  sample_rate: number
  peak_frequency: number
  peak_magnitude: number
  frequency_bands: {
    sub_bass: { range: string; avg_magnitude: number; peak_frequency: number }
    bass: { range: string; avg_magnitude: number; peak_frequency: number }
    low_midrange: { range: string; avg_magnitude: number; peak_frequency: number }
    midrange: { range: string; avg_magnitude: number; peak_frequency: number }
    upper_midrange: { range: string; avg_magnitude: number; peak_frequency: number }
    presence: { range: string; avg_magnitude: number; peak_frequency: number }
    brilliance: { range: string; avg_magnitude: number; peak_frequency: number }
  }
  log_frequency_summary?: {
    frequencies: number[]
    magnitudes: number[]
    points_per_octave: number
    frequency_range: [number, number]
    n_octaves: number
    n_points: number
  }
  normalization: {
    applied: boolean
    requested_freq?: number
    actual_freq?: number
    reference_level_db?: number
  }
}

const fftData = ref<FFTData | null>(null)
const isAnalyzingFFT = ref(false)
const fftError = ref<string>('')

// Smoothing selection
const smoothingType = ref<'1/3_octave' | '1/6_octave' | 'psychoacoustic'>('1/3_octave')

// Measurement name with default value
const measurementName = ref<string>('')

// Set default measurement name
const setDefaultMeasurementName = () => {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 16).replace('T', ' ')
  measurementName.value = `Room measurement ${dateStr}`
}


// Start room measurement: start recording (pre-roll), then trigger sine sweeps, then wait post-roll
const startRoomMeasurement = async () => {
  if (isMeasuringRoom.value) return
  try {
    // Require explicit selection of measurement type
    if (!signalType.value) {
      step4Error.value = 'Please select a signal type before starting the measurement.'
      return
    }
    step4Error.value = ''
    isMeasuringRoom.value = true
    currentSweepIndex.value = 0
    totalSweepDuration.value = null
    recordingId.value = null
    recordingFilename.value = ''

    // Ensure no noise is playing
    if (isNoiseePlaying.value) {
      await stopNoise()
    }

    // Calculate total durations based on signal type
    const preRoll = 1.0
    const postRoll = 1.0
    let signalDuration: number
    let totalRecording: number

  if (signalType.value === 'sine_sweep' || signalType.value === 'sox_sine_sweep') {
      const perSweepDuration = 5.0
      signalDuration = perSweepDuration * sweepCount.value
      totalRecording = preRoll + signalDuration + postRoll
    } else {
      // White noise - use a fixed duration
      signalDuration = 10.0 // 10 seconds of white noise
      totalRecording = preRoll + signalDuration + postRoll
    }

    // Start recording first
    const recResp = await startRoomEQRecording({
      duration: totalRecording,
      // sampleRate: 48000, // leave default if API chooses
      // filenameHint: undefined,
    })
    if (!recResp.success || !recResp.data) {
      throw new Error(recResp.detail || 'Failed to start recording')
    }
    recordingId.value = recResp.data.recording_id
    recordingFilename.value = recResp.data.filename

    // Pre-roll wait
    await new Promise((resolve) => setTimeout(resolve, preRoll * 1000))

    // Start signal generation based on type
  if (signalType.value === 'sine_sweep' || signalType.value === 'sox_sine_sweep') {
      let startResp = signalType.value === 'sox_sine_sweep'
        ? await startRoomEQSweepSox({
            sweeps: sweepCount.value,
            duration: 5.0,
            startFreq: 20,
            endFreq: 20000,
            amplitude: noiseAmplitude.value,
          })
        : await startRoomEQSweep({
        sweeps: sweepCount.value,
        duration: 5.0,
        startFreq: 20,
        endFreq: 20000,
        amplitude: noiseAmplitude.value,
        })
      if (!startResp.success || !startResp.data) {
        // If SoX fails, fall back to built-in sweep automatically
        if (signalType.value === 'sox_sine_sweep') {
          console.warn('SoX sweep failed, falling back to built-in sweep:', startResp.detail)
          const fallback = await startRoomEQSweep({
            sweeps: sweepCount.value,
            duration: 5.0,
            startFreq: 20,
            endFreq: 20000,
            amplitude: noiseAmplitude.value,
          })
          if (!fallback.success || !fallback.data) {
            throw new Error(fallback.detail || 'Failed to start sine sweeps')
          }
          startResp = fallback
        } else {
          throw new Error(startResp.detail || 'Failed to start sine sweeps')
        }
      }
  // At this point we know startResp.success && startResp.data are truthy from the checks above
  totalSweepDuration.value = (startResp.data!).total_duration
    } else {
      // White noise
      const startResp = await startRoomEQNoise(noiseAmplitude.value, signalDuration)
      if (!startResp.success || !startResp.data) {
        throw new Error(startResp.detail || 'Failed to start white noise')
      }
      totalSweepDuration.value = signalDuration
    }

  // Store start time for progress calculation (right after signal start)
  const sweepStartTime = Date.now()

    // Set up progress tracking for sine sweeps using known timing
  if (signalType.value === 'sine_sweep' || signalType.value === 'sox_sine_sweep') {
      const perSweepDuration = 5.0
      sweepStatusInterval.value = window.setInterval(() => {
    const elapsed = (Date.now() - sweepStartTime) / 1000
        if (elapsed > 0 && elapsed < signalDuration) {
          const newSweepIndex = Math.min(sweepCount.value - 1, Math.floor(elapsed / perSweepDuration))
          currentSweepIndex.value = newSweepIndex
        }
      }, 500)

      // Clear progress tracking when signal should be finished
      setTimeout(() => {
        if (sweepStatusInterval.value) {
          clearInterval(sweepStatusInterval.value)
          sweepStatusInterval.value = null
        }
      }, (preRoll + signalDuration + 1) * 1000) // +1 second buffer
    }

  // start time already stored above

    // After recording and sweeps are complete, auto-advance
    if (recordingId.value != null) {
      console.log('Setting up auto-advance timer for', totalRecording, 'seconds')
      setTimeout(() => {
        console.log('Auto-advance timer expired, finishing measurement...')
        // Clear any remaining intervals
        if (sweepStatusInterval.value) {
          clearInterval(sweepStatusInterval.value)
          sweepStatusInterval.value = null
        }
        isMeasuringRoom.value = false
        // Auto-advance to next step
        if (currentStep.value < totalSteps.value) currentStep.value++
        else completeMeasurement()
      }, totalRecording * 1000)
    }
  } catch (error) {
    console.error('Room measurement failed:', error)
  } finally {
    // Don't flip off immediately if polling will mark completion; let poller clear state
    if (!sweepStatusInterval.value) {
      isMeasuringRoom.value = false
    }
  }
}

// SPL meter helper functions
const SPL_MIN = 40
const SPL_MAX = 100

const splTicks = computed(() => {
  const ticks: number[] = []
  for (let v = SPL_MIN; v <= SPL_MAX; v += 10) ticks.push(v)
  return ticks
})

const getSPLPercentage = (spl: number): number => {
  // Map SPL from SPL_MIN-SPL_MAX dB range to 0-100%
  const percentage = Math.max(0, Math.min(100, ((spl - SPL_MIN) / (SPL_MAX - SPL_MIN)) * 100))
  return percentage
}

const getSPLColor = (spl: number): string => {
  // Inside optimal range (70–90 dB): green, otherwise: yellow
  return spl >= 70 && spl <= 90 ? '#28a745' : '#ffc107'
}

// Measure SPL using the RoomEQ API
const measureSPL = async () => {
  // Prevent concurrent SPL measurements
  if (isMeasuringSPL.value) return

  // Only measure SPL when in step 3 and measurement is active
  if (currentStep.value !== 3 || !isMeasuring.value) return

  isMeasuringSPL.value = true
  try {
    const response = await measureRoomEQSPL()
    if (response.success && response.data) {
      // Update current SPL value
      const newSPL = response.data.spl_db
      currentSPL.value = newSPL
      console.log('SPL measurement:', newSPL, 'dB')
    } else {
      console.warn('SPL measurement failed:', response.detail)
    }
  } catch (error) {
    console.error('Error measuring SPL:', error)
  } finally {
    isMeasuringSPL.value = false

    // Start next measurement if we're still in measuring mode AND in step 3
    if (isMeasuring.value && currentStep.value === 3) {
      // Small delay to prevent overwhelming the API
      setTimeout(() => {
        if (isMeasuring.value && currentStep.value === 3) {
          measureSPL()
        }
      }, 100)
    }
  }
}

// Start continuous SPL measurement
const startSPLMeasurement = () => {
  if (isMeasuring.value) return

  console.log('Starting continuous SPL measurement')
  isMeasuring.value = true

  // Start the measurement loop
  measureSPL()
}

// Stop continuous SPL measurement
const stopSPLMeasurement = () => {
  if (!isMeasuring.value) return

  console.log('Stopping SPL measurement')
  isMeasuring.value = false
  isMeasuringSPL.value = false // Reset concurrent measurement flag
}

// Create dummy audio context for the meter display with SPL value updates
onMounted(() => {
  try {
    // Create a dummy audio context with an oscillator for display purposes
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const audioContext = new AudioContextClass()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime) // 1kHz tone
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime) // Low volume

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Don't start the oscillator, just set up the nodes for the meter
    dummyAudioContext.value = audioContext
    dummyAudioSource.value = gainNode

  } catch (error) {
    console.warn('Could not create audio context for VU meter display:', error)
  }
})

// Watch current step and start/stop SPL measurement accordingly
watch(currentStep, (newStep) => {
  if (newStep === 3) {
    // Start SPL measurement when entering step 3 (Test Audio Level)
    startSPLMeasurement()
  } else {
    // Stop SPL measurement when leaving step 3
    stopSPLMeasurement()
  }

  if (newStep === 5 && recordingId.value) {
    // Perform FFT analysis when entering step 5
    performFFTAnalysis()
  }
})

// Cleanup when component unmounts
onBeforeUnmount(() => {
  stopSPLMeasurement()

  if (dummyAudioContext.value) {
    dummyAudioContext.value.close()
  }

  // Clear measurement intervals
  if (sweepStatusInterval.value) {
    clearInterval(sweepStatusInterval.value)
    sweepStatusInterval.value = null
  }
})

// Methods
const handleOverlayClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    closeWizard()
  }
}

const closeWizard = () => {
  // Stop any ongoing SPL measurements before closing
  if (isMeasuring.value) {
    stopSPLMeasurement()
  }
  emit('close')
  resetWizard()
}

const resetWizard = () => {
  currentStep.value = 1
  loadingMicrophones.value = false
  microphoneError.value = ''
  detectedMicrophones.value = []
  selectedMicrophone.value = null

  // Reset SPL measurement state
  currentSPL.value = -80
  isMeasuring.value = false
  isMeasuringSPL.value = false

  // Reset room measurement state
  isMeasuringRoom.value = false
  currentSweepIndex.value = 0
  totalSweepDuration.value = null
  recordingId.value = null
  recordingFilename.value = ''
  sweepCount.value = 2
  // Set signal type based on expert mode
  signalType.value = isExpertMode.value ? null : 'sine_sweep'
  step4Error.value = ''

  // Reset FFT analysis state
  fftData.value = null
  isAnalyzingFFT.value = false
  fftError.value = ''
  // Set smoothing type based on expert mode (always defaults to 1/3 octave)
  smoothingType.value = '1/3_octave'

  // Stop noise if playing
  if (isNoiseePlaying.value) {
    stopNoise()
  }

  // Stop SPL measurements if active
  if (isMeasuring.value) {
    stopSPLMeasurement()
  }

  // Clear keep-alive interval
  if (keepAliveInterval.value) {
    clearInterval(keepAliveInterval.value)
    keepAliveInterval.value = null
  }

  // Clear measurement intervals
  if (sweepStatusInterval.value) {
    clearInterval(sweepStatusInterval.value)
    sweepStatusInterval.value = null
  }
}

const initializeWizard = () => {
  // Always start fresh - reset everything to initial state
  resetWizard()

  // Set default measurement name
  setDefaultMeasurementName()

  // Detect microphones for step 1
  detectMicrophones()
}

const detectMicrophones = async () => {
  loadingMicrophones.value = true
  microphoneError.value = ''
  detectedMicrophones.value = []
  selectedMicrophone.value = null

  try {
    console.log('Detecting microphones...')
    const response = await getRoomEQMicrophones()

    if (response.success && response.data) {
      detectedMicrophones.value = response.data
      console.log(`Found ${response.data.length} microphones:`, response.data)

      // Auto-select the first microphone if only one is found
      if (response.data.length === 1) {
        selectedMicrophone.value = response.data[0]
      }
    } else {
      microphoneError.value = response.detail || 'Failed to detect microphones'
    }
  } catch (error) {
    console.error('Error detecting microphones:', error)
    microphoneError.value = error instanceof Error ? error.message : 'Unknown error occurred'
  } finally {
    loadingMicrophones.value = false
  }
}

const selectMicrophone = (microphone: RoomEQMicrophone) => {
  selectedMicrophone.value = microphone
  console.log('Selected microphone:', microphone)
}

const nextStep = () => {
  if (canProceedToNextStep.value && currentStep.value < totalSteps.value) {
    // Pause all players when entering step 3 (Audio Level)
    if (currentStep.value === 2) {
      pausePlayers()
    }
    // Stop noise and SPL measurements when leaving step 3
    if (currentStep.value === 3) {
      if (isNoiseePlaying.value) {
        stopNoise()
      }
      if (isMeasuring.value) {
        stopSPLMeasurement()
      }
    }
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    // Stop noise and SPL measurements when leaving step 3
    if (currentStep.value === 3) {
      if (isNoiseePlaying.value) {
        stopNoise()
      }
      if (isMeasuring.value) {
        stopSPLMeasurement()
      }
    }
    currentStep.value--
  }
}

const pausePlayers = async () => {
  try {
    console.log('Pausing all players for room measurement')
    await pauseAllPlayers()
  } catch (error) {
    console.error('Error pausing players:', error)
  }
}

const toggleNoise = async () => {
  if (isNoiseePlaying.value) {
    await stopNoise()
  } else {
    await startNoise()
  }
}

const startNoise = async () => {
  try {
    console.log('Starting white noise for room measurement')
    const response = await startRoomEQNoise(noiseAmplitude.value, 3.0)
    if (response.success) {
      isNoiseePlaying.value = true

      // Start keep-alive mechanism - send request every 2 seconds
      keepAliveInterval.value = window.setInterval(async () => {
        try {
          console.log('Extending noise playback (keep-alive)')
          await keepRoomEQNoisePlaying(3.0)
        } catch (error) {
          console.error('Keep-alive failed:', error)
          // If keep-alive fails, stop the noise
          isNoiseePlaying.value = false
          if (keepAliveInterval.value) {
            clearInterval(keepAliveInterval.value)
            keepAliveInterval.value = null
          }
        }
      }, 2000)
    } else {
      console.error('Failed to start noise:', response.detail)
    }
  } catch (error) {
    console.error('Error starting noise:', error)
  }
}

const stopNoise = async () => {
  try {
    console.log('Stopping white noise')

    // Clear keep-alive interval first
    if (keepAliveInterval.value) {
      clearInterval(keepAliveInterval.value)
      keepAliveInterval.value = null
    }

    const response = await stopRoomEQNoise()
    if (response.success) {
      isNoiseePlaying.value = false
    } else {
      console.error('Failed to stop noise:', response.detail)
      // Still set to false even if API call failed
      isNoiseePlaying.value = false
    }
  } catch (error) {
    console.error('Error stopping noise:', error)
    // Still set to false even if there's an error
    isNoiseePlaying.value = false
  }
}

const updateSystemVolume = async (newVolume: number) => {
  console.log('Setting system volume to:', newVolume)
  await playerStore.setVolume(newVolume)
}

// Perform FFT analysis on the recorded file
const performFFTAnalysis = async () => {
  if (!recordingId.value || isAnalyzingFFT.value) return

  try {
    isAnalyzingFFT.value = true
    fftError.value = ''
    console.log('Starting FFT analysis for recording ID:', recordingId.value, 'with smoothing:', smoothingType.value)

    // Calculate parameters based on smoothing type
    let pointsPerOctave: number | undefined = undefined
    let psychoacousticSmoothing: number | undefined = undefined

    if (smoothingType.value === '1/3_octave') {
      pointsPerOctave = 12 // 1/3 octave spacing
    } else if (smoothingType.value === '1/6_octave') {
      pointsPerOctave = 24 // 1/6 octave spacing
    } else if (smoothingType.value === 'psychoacoustic') {
      pointsPerOctave = 16 // Default octave spacing
      psychoacousticSmoothing = 1.0 // Enable psychoacoustic smoothing
    }

    const response = await analyzeRoomEQFFTRecording(recordingId.value, 1000, undefined, pointsPerOctave, psychoacousticSmoothing)

    if (response.success && response.data) {
      // Extract FFT data from the new API response structure
      const analysisData = response.data

      // Log only the smoothed/logarithmic frequency data
      if (analysisData.fft_analysis.log_frequency_summary) {
        console.log('=== SMOOTHED FREQUENCY DATA ===')
        console.log('Log frequency summary:', analysisData.fft_analysis.log_frequency_summary)
        console.log('Normalization:', analysisData.fft_analysis.normalization)
        console.log('=== END SMOOTHED DATA ===')
      }

      // Store the FFT data (API already normalized to 1kHz if requested)
      fftData.value = {
        frequencies: analysisData.fft_analysis.frequencies,
        magnitude: analysisData.fft_analysis.magnitudes,
        phase: analysisData.fft_analysis.phases,
        sample_rate: analysisData.fft_analysis.sample_rate,
        peak_frequency: analysisData.fft_analysis.peak_frequency,
        peak_magnitude: analysisData.fft_analysis.peak_magnitude,
        frequency_bands: analysisData.fft_analysis.frequency_bands,
        log_frequency_summary: analysisData.fft_analysis.log_frequency_summary,
        normalization: analysisData.fft_analysis.normalization
      }

      console.log('FFT data stored:', fftData.value)
      console.log('Normalization info:', fftData.value.normalization)
    } else {
      throw new Error(response.detail || 'FFT analysis failed')
    }
  } catch (error) {
    console.error('FFT analysis error:', error)
    fftError.value = error instanceof Error ? error.message : 'Unknown error occurred'
  } finally {
    isAnalyzingFFT.value = false
  }
}

const completeMeasurement = () => {
  console.log('Completing measurement with microphone:', selectedMicrophone.value)
  emit('measurementCompleted')
}

const saveMeasurement = async () => {
  if (!fftData.value) {
    console.error('No FFT data available to save')
    return
  }

  if (!measurementName.value.trim()) {
    console.error('Measurement name is required')
    return
  }

  try {
    const settingsStore = useSettingsStore()

    // Prefer logarithmic frequency summary if available (this matches what's displayed in step 5)
    let frequencies: number[]
    let magnitudes: number[]
    let metadata: {
      frequency_type?: 'log_summary' | 'fft'
      points_per_octave?: number
      frequency_range?: [number, number]
    } = {}

    if (fftData.value.log_frequency_summary?.frequencies && fftData.value.log_frequency_summary?.magnitudes) {
      console.log('Saving logarithmic frequency summary data (16 points per octave)')
      frequencies = fftData.value.log_frequency_summary.frequencies
      magnitudes = fftData.value.log_frequency_summary.magnitudes
      metadata = {
        frequency_type: 'log_summary' as const,
        points_per_octave: fftData.value.log_frequency_summary.points_per_octave,
        frequency_range: fftData.value.log_frequency_summary.frequency_range
      }
    } else {
      console.log('Saving regular FFT frequency data')
      frequencies = fftData.value.frequencies
      magnitudes = fftData.value.magnitude
      metadata = {
        frequency_type: 'fft' as const
      }
    }

    const measurementId = await settingsStore.saveRoomMeasurement(
      measurementName.value.trim(),
      frequencies,
      magnitudes,
      fftData.value.sample_rate,
      metadata
    )

    console.log(`Measurement saved with ID: ${measurementId}`)
    emit('measurementCompleted')
  } catch (error) {
    console.error('Failed to save measurement:', error)
  }
}

// Helper function to generate SVG path for frequency response curve
const generateFrequencyResponsePath = (data: FFTData): string => {
  // Prefer logarithmic frequency summary if available (better for acoustic visualization)
  let frequencies: number[]
  let magnitudes: number[]

  if (data.log_frequency_summary?.frequencies && data.log_frequency_summary?.magnitudes) {
    frequencies = data.log_frequency_summary.frequencies
    magnitudes = data.log_frequency_summary.magnitudes
  } else if (data.frequencies && data.magnitude) {
    frequencies = data.frequencies
    magnitudes = data.magnitude
  } else {
    return ''
  }

  const minFreq = 20
  const maxFreq = 20000
  const minMag = -30 // -30 dB
  const maxMag = 30  // +30 dB
  const width = 760 - 40 // Chart width minus margins
  const height = 280 - 20 // Chart height minus margins

  const logScale = (freq: number) => {
    return 40 + (Math.log10(freq / minFreq) / Math.log10(maxFreq / minFreq)) * width
  }

  const magScale = (mag: number) => {
    return 20 + (maxMag - mag) / (maxMag - minMag) * height
  }

  let path = ''
  for (let i = 0; i < frequencies.length; i++) {
    const freq = frequencies[i]
    const mag = magnitudes[i]

    if (freq >= minFreq && freq <= maxFreq) {
      const x = logScale(freq)
      const y = magScale(mag)

      if (path === '') {
        path = `M ${x} ${y}`
      } else {
        path += ` L ${x} ${y}`
      }
    }
  }

  return path
}

// Lifecycle
onMounted(() => {
  // Set default measurement name initially
  setDefaultMeasurementName()

  if (props.isOpen) {
    initializeWizard()
  }
})

// Watch for prop changes to auto-detect when wizard opens
watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    initializeWizard()
  }
})

// Watch for smoothing type changes and recalculate FFT
watch(smoothingType, () => {
  if (recordingId.value && currentStep.value === 5) {
    performFFTAnalysis()
  }
})
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--background-card);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 700px;
  width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  position: relative;

  .nav-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
    font-size: 0.875rem;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &.secondary {
      background: var(--color-bg-secondary);
      color: var(--color-body);
      border: 1px solid var(--color-border);

      &:hover:not(:disabled) {
        background: var(--color-border);
      }
    }

    &.primary {
      background: var(--primary);
      color: white;

      &:hover:not(:disabled) {
        background: var(--primary-dark, var(--primary));
        opacity: 0.9;
      }
    }

    &.danger {
      background: #dc3545;
      color: white;

      &:hover:not(:disabled) {
        background: #c82333;
      }
    }

    svg {
      width: 16px;
      height: 16px;
    }
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px 20px 32px;
  border-bottom: 1px solid var(--color-border);

  h2 {
    margin: 0;
    color: var(--color-head);
    font-size: 1.5rem;
    font-weight: 600;
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    color: var(--color-body-secondary);
    transition: all 0.2s ease;

    &:hover {
      background: var(--color-bg-secondary);
      color: var(--color-head);
    }

    svg {
      width: 18px;
      height: 18px;
    }
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}

.step-content {
  .step-header {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 24px;

    .step-icon {
      width: 48px;
      height: 48px;
      color: var(--primary);
      flex-shrink: 0;
      margin-top: 4px;
    }

    .step-info {
      flex: 1;

      h3 {
        margin: 0 0 8px 0;
        color: var(--color-head);
        font-size: 1.375rem;
        font-weight: 600;
      }

      p {
        margin: 0;
        color: var(--color-body-secondary);
        font-size: 1rem;
        line-height: 1.5;
      }
    }
  }

  .measurement-mic-image {
    width: 100%;
    height: 200px;
    border-radius: 12px;
    overflow: hidden;
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 32px;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center;
    }
  }

  /* Step 4 styles */
  .measure-settings {
    margin: 16px 0 24px 0;
    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;

      .setting-label {
        color: var(--color-head);
        font-weight: 500;
      }

      .segmented {
        display: inline-flex;
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        overflow: hidden;

        .segmented-btn {
          padding: 6px 10px;
          background: transparent;
          border: none;
          color: var(--color-body);
          cursor: pointer;
          font-weight: 500;

          &.active {
            background: var(--primary);
            color: white;
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }
      }

      .signal-type-options {
        display: flex;
        gap: 12px;
        margin-top: 8px;

        .signal-option {
          flex: 1;
          padding: 12px;
          border: 2px solid var(--color-border);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: var(--color-bg);

          &:hover:not(.disabled) {
            border-color: var(--primary);
            background: var(--color-bg-secondary);
          }

          &.active {
            border-color: var(--primary);
            background: var(--primary-alpha-10);
          }

          &.disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .signal-option-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;

            .signal-option-label {
              font-weight: 600;
              color: var(--color-head);
            }
          }

          .signal-option-description {
            font-size: 0.9em;
            color: var(--color-body);
            line-height: 1.4;
          }
        }
      }
      .setting-error {
        color: var(--color-error, #dc3545);
        font-size: 0.875rem;
        margin-top: 8px;
      }
    }
  }

  .measure-actions {
    display: flex;
    justify-content: center;
    margin-top: 8px;
    margin-bottom: 12px;
  }

  .recording-file {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-body-secondary);
    font-size: 0.9rem;
    margin-bottom: 10px;

    .mono {
      font-family: monospace;
      color: var(--color-head);
    }
  }

  .progress-info {
    .progress-text {
      text-align: center;
      color: var(--color-body-secondary);
      margin-bottom: 8px;
      font-size: 0.9rem;
    }
    .progress-bar {
      width: 100%;
      height: 8px;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 999px;
      overflow: hidden;

      .fill {
        height: 100%;
        width: 0%;
        background: var(--primary);
        transition: width 0.25s ease;
      }
    }
  }

  /* Step 5 styles */
  .measurement-summary {
    margin: 24px 0;

    h4 {
      margin: 0 0 16px 0;
      color: var(--color-head);
      font-size: 1.125rem;
      font-weight: 600;
    }

    p {
      margin: 0 0 20px 0;
      color: var(--color-body);
      line-height: 1.5;
    }

    .recording-file-final {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      color: var(--color-head);
      font-size: 1rem;

      .mono {
        font-family: monospace;
        font-weight: 600;
        color: var(--primary);
      }

      svg {
        width: 20px;
        height: 20px;
        color: var(--primary);
      }
    }
  }

  .loading-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px;
    text-align: center;

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-border);
      border-top: 3px solid var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    p {
      margin: 0;
      color: var(--color-body-secondary);
    }
  }

  .error-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px;
    text-align: center;

    .error-icon {
      width: 48px;
      height: 48px;
      color: var(--color-error, #dc3545);
      margin-bottom: 16px;
    }

    .error-message {
      margin: 0 0 24px 0;
      color: var(--color-error, #dc3545);
      font-weight: 500;
    }

    .retry-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s ease;

      &:hover {
        background: var(--primary-dark, var(--primary));
        opacity: 0.9;
      }

      svg {
        width: 16px;
        height: 16px;
      }
    }
  }

  .empty-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px;
    text-align: center;

    .empty-icon {
      width: 64px;
      height: 64px;
      color: var(--color-body-secondary);
      opacity: 0.6;
      margin-bottom: 24px;
    }

    h4 {
      margin: 0 0 16px 0;
      color: var(--color-head);
      font-size: 1.25rem;
      font-weight: 600;
    }

    p {
      margin: 0 0 24px 0;
      color: var(--color-body-secondary);
      line-height: 1.5;
      max-width: 400px;
    }

    .retry-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s ease;

      &:hover {
        background: var(--primary-dark, var(--primary));
        opacity: 0.9;
      }

      svg {
        width: 16px;
        height: 16px;
      }
    }
  }

  .microphones-section {
    h4 {
      margin: 0 0 20px 0;
      color: var(--color-head);
      font-size: 1.125rem;
      font-weight: 600;
    }

    .microphones-list {
      display: grid;
      gap: 12px;
      margin-bottom: 32px;

      .microphone-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: var(--background-card);
        border: 2px solid var(--color-border);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          border-color: var(--primary);
          background: var(--color-bg-secondary);
        }

        &.selected {
          border-color: var(--primary);
          background: rgba(var(--primary-rgb, 225, 30, 74), 0.05);
        }

        .microphone-info {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;

          .microphone-icon {
            width: 32px;
            height: 32px;
            color: var(--primary);
            flex-shrink: 0;
          }

          .microphone-details {
            flex: 1;

            h5 {
              margin: 0 0 6px 0;
              color: var(--color-head);
              font-size: 1rem;
              font-weight: 600;
            }

            .microphone-specs {
              margin: 0;
              font-size: 0.875rem;
              color: var(--color-body-secondary);
              display: flex;
              flex-wrap: wrap;
              gap: 16px;

              .spec-item {
                white-space: nowrap;
              }
            }
          }
        }

        .microphone-select {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;

          .check-icon {
            width: 20px;
            height: 20px;
            color: var(--primary);
          }
        }
      }
    }

    .selected-microphone-info {
      h5 {
        margin: 0 0 16px 0;
        color: var(--color-head);
        font-size: 1rem;
        font-weight: 600;
      }

      .microphone-details-card {
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 20px;

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--color-border);

          &:last-child {
            border-bottom: none;
          }

          .detail-label {
            font-weight: 500;
            color: var(--color-body-secondary);
          }

          .detail-value {
            font-weight: 500;
            color: var(--color-head);
            font-family: 'Metropolis', monospace;
          }
        }
      }
    }

    .positioning-instructions {
      p {
        margin: 0;
        color: var(--color-body);
        font-size: 1rem;
        line-height: 1.6;
        text-align: center;
        padding: 24px 32px;
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: 8px;
      }
    }

    .audio-level-instructions {
      .level-guidance {
        margin-bottom: 24px;

        h4 {
          margin: 0 0 16px 0;
          color: var(--color-head);
          font-size: 1.125rem;
          font-weight: 600;
        }

        p {
          margin: 0;
          color: var(--color-body);
          line-height: 1.5;
        }
      }

      .noise-controls[data-component="room-wizard"] {
        margin-bottom: 24px;
        margin-top: 32px;

        > h4 {
          color: var(--color-head);
          font-size: 1.125rem;
          font-weight: 600;
        }

        .controls-section {
          display: flex;
          flex-direction: column;
          gap: 20px;

          .noise-button-container {
            display: flex;
            justify-content: center;
          }

          .volume-control {
            .volume-header {
              .volume-label {
                color: var(--color-head);
                font-weight: 500;
                font-size: 1rem;
              }
            }

            .volume-slider-container {
              width: 100%;
            }
          }

          .measured-level-control {
            .measured-level-header {
              display: flex;
              justify-content: space-between;
              align-items: center;

              .measured-level-label {
                color: var(--color-head);
                font-weight: 500;
                font-size: 1rem;
              }

              .measured-level-value {
                color: var(--color-body);
                font-weight: 600;
                font-size: 0.9rem;
                background: var(--color-bg-secondary);
                padding: 4px 8px;
                border-radius: 4px;
                border: 1px solid var(--color-border);
                font-family: monospace;
                min-width: 6ch;
                text-align: center;
              }
            }

            .measured-level-meter-container {
              width: 100%;

              .vu-meter {
                width: 100%;

                .spl-meter-bar {
                  width: 100%;
                  margin-bottom: 12px;

                  .spl-meter-track {
                    width: 100%;
                    height: 20px;
                    background: var(--color-bg-secondary);
                    border: 1px solid var(--color-border);
                    border-radius: 6px;
                    position: relative;
                    overflow: hidden;
                    margin-bottom: 8px;

                    .spl-meter-fill {
                      position: absolute;
                      top: 0;
                      left: 0;
                      bottom: 0;
                      height: 100%;
                      transition: width 0.2s ease, background-color 0.2s ease;
                      border-radius: 5px 0 0 5px;
                    }
                  }

                  .spl-scale {
                    width: 100%;
                    padding: 0 4px;
                    font-size: 0.7rem;
                    color: var(--color-body-secondary);
                    font-weight: 500;
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    text-align: center;

                    .scale-mark {
                      &.optimal {
                        color: #28a745; /* green */
                        font-weight: 600;
                      }
                    }
                  }
                }

                .optimal-range-indicator {
                  text-align: center;
                  margin-top: 12px;

                  .range-label {
                    font-size: 0.75rem;
                    color: white;
                    background: var(--primary);
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-weight: 500;
                    display: inline-block;
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

.modal-footer {
  border-top: 1px solid var(--color-border);
  padding: 20px 32px;

  .step-navigation {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .step-indicator {
      font-size: 0.875rem;
      color: var(--color-body-secondary);
      font-weight: 500;
    }
  }
}

/* Ensure SPL meter styles apply outside of .microphones-section scope */
.positioning-instructions {
  p {
    margin: 0;
    color: var(--color-body);
    font-size: 1rem;
    line-height: 1.6;
    text-align: center;
    padding: 24px 32px;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
  }
}

.audio-level-instructions {
  .level-guidance {
    margin-bottom: 24px;

    h4 {
      margin: 0 0 16px 0;
      color: var(--color-head);
      font-size: 1.125rem;
      font-weight: 600;
    }

    p {
      margin: 0;
      color: var(--color-body);
      line-height: 1.5;
    }
  }

  .noise-controls[data-component="room-wizard"] {
    margin-bottom: 24px;
    margin-top: 32px;

    > h4 {
      color: var(--color-head);
      font-size: 1.125rem;
      font-weight: 600;
    }

    .controls-section {
      display: flex;
      flex-direction: column;
      gap: 20px;

      .noise-button-container {
        display: flex;
        justify-content: center;
      }

      .volume-control {
        .volume-header {
          .volume-label {
            color: var(--color-head);
            font-weight: 500;
            font-size: 1rem;
          }
        }

        .volume-slider-container {
          width: 100%;
        }
      }

      .measured-level-control {
        .measured-level-header {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .measured-level-label {
            color: var(--color-head);
            font-weight: 500;
            font-size: 1rem;
          }

          .measured-level-value {
            color: var(--color-body);
            font-weight: 600;
            font-size: 0.9rem;
            background: var(--color-bg-secondary);
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid var(--color-border);
            font-family: monospace;
            min-width: 6ch;
            text-align: center;
          }
        }

        .measured-level-meter-container {
          width: 100%;

          .vu-meter {
            width: 100%;

            .spl-meter-bar {
              width: 100%;
              margin-bottom: 12px;

              .spl-meter-track {
                width: 100%;
                height: 20px; /* Fix collapse */
                background: var(--color-bg-secondary);
                border: 1px solid var(--color-border);
                border-radius: 6px;
                position: relative;
                overflow: hidden;
                margin-bottom: 8px;

                .spl-meter-fill {
                  position: absolute;
                  top: 0;
                  left: 0;
                  bottom: 0;
                  height: 100%;
                  transition: width 0.2s ease, background-color 0.2s ease;
                  border-radius: 5px 0 0 5px;
                }
              }

              .spl-scale {
                position: relative;
                width: 100%;
                height: 20px; /* room for labels */
                margin-top: 2px;
                font-size: 0.7rem;
                color: var(--color-body-secondary);
                font-weight: 500;

                .scale-mark {
                  position: absolute;
                  transform: translateX(-50%);
                  bottom: 0;
                  white-space: nowrap;

                  &::before {
                    content: "";
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    top: -10px; /* tick above label */
                    width: 1px;
                    height: 8px;
                    background: var(--color-border);
                  }

                  &:first-child {
                    transform: none; /* align 40 at the left edge */
                  }

                  &:last-child {
                    transform: translateX(-100%); /* align 100 at the right edge */
                  }

                  &.optimal {
                    color: #28a745; /* green */
                    font-weight: 600;
                  }
                }
              }
            }

            .optimal-range-indicator {
              text-align: center;
              margin-top: 12px;

              .range-label {
                font-size: 0.75rem;
                color: #0f5132;
                background: #d1e7dd; /* green-ish badge */
                padding: 2px 6px;
                border-radius: 3px;
                font-weight: 600;
                display: inline-block;
                border: 1px solid #badbcc;
              }
            }
          }
        }
      }
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .modal-content {
    width: 95vw;
    max-height: 90vh;
  }

  .modal-header {
    padding: 20px 24px 16px 24px;

    h2 {
      font-size: 1.25rem;
    }
  }

  .modal-body {
    padding: 24px;
  }

  .modal-footer {
    padding: 16px 24px;

    .step-navigation {
      .step-indicator {
        font-size: 0.8125rem;
      }
    }
  }

  .step-content {
    .measurement-mic-image {
      height: 150px;
    }

    .positioning-instructions {
      p {
        padding: 20px 24px;
        font-size: 0.875rem;
      }
    }

    .audio-level-instructions {
      .level-guidance {
        h4 {
          font-size: 1rem;
        }

        p {
          font-size: 0.875rem;
        }
      }

      .noise-controls {
        h4 {
          font-size: 1rem;
        }

        .controls-section {
          gap: 16px;

          .volume-control {
            .volume-header {
              .volume-label {
                font-size: 0.875rem;
              }
            }
          }
        }
      }
    }

    .microphones-section {
      .microphones-list {
        .microphone-item {
          .microphone-info {
            .microphone-details {
              .microphone-specs {
                flex-direction: column;
                gap: 4px;
                align-items: flex-start;
              }
            }
          }
        }
      }
    }
  }
}

// Measurement name input styles
.measurement-name-section {
  margin-top: 24px;

  h4 {
    color: #2c3e50;
    margin-bottom: 16px;
  }

  .name-input-group {
    display: flex;
    flex-direction: column;
    gap: 8px;

    label {
      font-weight: 600;
      color: #495057;
    }

    .measurement-name-input {
      padding: 12px 16px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 1rem;
      font-family: inherit;
      transition: border-color 0.2s ease;

      &:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
      }

      &::placeholder {
        color: #6c757d;
      }
    }
  }
}

// FFT Analysis styles
.fft-analysis {
  margin-top: 24px;

  .analysis-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;

    h4 {
      color: #2c3e50;
      margin: 0;
    }

    .smoothing-selection {
      display: flex;
      align-items: center;
      gap: 8px;

      label {
        font-size: 14px;
        color: #666;
        font-weight: 500;
      }

      .smoothing-dropdown {
        padding: 6px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        background: white;
        font-size: 14px;
        min-width: 140px;
        cursor: pointer;

        &:hover {
          border-color: #007bff;
        }

        &:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
        }
      }
    }
  }

  h4 {
    color: #2c3e50;
    margin-bottom: 16px;
  }

  .fft-loading {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #666;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;

    .fft-loading-icon {
      animation: spin 1s linear infinite;
    }
  }

  .fft-error {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #dc3545;
    padding: 16px;
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    border-radius: 8px;
  }

  .fft-chart {
    p {
      margin-bottom: 16px;
      color: #666;
      font-size: 0.875rem;
    }

    .frequency-response-chart {
      background: #1a1a1a;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;

      .response-svg {
        width: 100%;
        height: auto;
        max-height: 300px;

        .axis-label {
          fill: #ccc;
          font-size: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
      }
    }

    .frequency-bands {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;

      .band-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: #f8f9fa;
        border-radius: 6px;
        border: 1px solid #e9ecef;

        .band-name {
          font-weight: 600;
          color: #2c3e50;
        }

        .band-range {
          font-size: 0.75rem;
          color: #666;
        }

        .band-level {
          font-weight: 600;
          color: #28a745;
          font-family: 'Courier New', monospace;
        }
      }
    }
  }
}
</style>
