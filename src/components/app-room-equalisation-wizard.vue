<template>
  <div v-if="isOpen && measurement" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Room Equalisation Wizard</h2>
        <button @click="closeWizard" class="close-button" title="Close">
          <AppIcon icon="close" />
        </button>
      </div>

      <div class="modal-body">
        <!-- Step 1: Review Frequency Response -->
        <div v-if="currentStep === 1" class="step-content">
          <div class="step-header">
            <AppIcon icon="tabler/wave-sine" class="step-icon" />
            <div class="step-info">
              <h3>Step 1: Review Frequency Response</h3>
              <p>Preview the measured response before creating correction filters.</p>
            </div>
          </div>

          <div class="fft-analysis">
            <div class="analysis-header">
              <h4>Frequency Response</h4>
              <div class="meta" v-if="measurement.points_per_octave || measurement.frequency_type === 'fft'">
                <span v-if="measurement.points_per_octave">{{ measurement.points_per_octave }} p/o</span>
                <span v-if="measurement.frequency_range">{{ measurement.frequency_range[0] }}–{{ measurement.frequency_range[1] }} Hz</span>
                <span v-else>{{ measurement.sample_rate }} Hz</span>
              </div>
            </div>
            <div class="fft-chart">
              <div class="frequency-response-chart">
                <svg viewBox="0 0 800 300" class="response-svg">
                  <defs>
                    <pattern id="grid-eq" width="40" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#444" stroke-width="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="800" height="300" fill="url(#grid-eq)" />

                  <g class="frequency-axis">
                    <text x="50" y="290" text-anchor="middle" class="axis-label">20</text>
                    <text x="200" y="290" text-anchor="middle" class="axis-label">100</text>
                    <text x="400" y="290" text-anchor="middle" class="axis-label">1k</text>
                    <text x="600" y="290" text-anchor="middle" class="axis-label">10k</text>
                    <text x="750" y="290" text-anchor="middle" class="axis-label">25k</text>
                  </g>

                  <g class="magnitude-axis">
                    <text x="20" y="250" text-anchor="middle" class="axis-label">-20</text>
                    <text x="20" y="150" text-anchor="middle" class="axis-label">0</text>
                    <text x="20" y="50" text-anchor="middle" class="axis-label">+20</text>
                  </g>

                  <path :d="generatePath(measurement)" fill="none" stroke="#4CAF50" stroke-width="2" />
                  <line x1="40" y1="150" x2="760" y2="150" stroke="#666" stroke-width="1" stroke-dasharray="5,5"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

  <!-- Step 2: Equalisation Options -->
  <div v-if="currentStep === 2" class="step-content">
          <div class="step-header">
            <AppIcon icon="tabler/settings" class="step-icon" />
            <div class="step-info">
              <h3>Step 2: Equalisation Options</h3>
              <p>Choose how to generate the correction filters for your room.</p>
            </div>
          </div>

          <div class="eq-options">
            <div class="option-row">
              <label class="option-label">Target curve</label>
              <div class="segmented" v-if="targetNames.length">
                <button
                  v-for="name in targetNames"
                  :key="name"
                  type="button"
                  class="segmented-btn"
                  :class="{ active: targetCurve === name }"
                  @click="selectTarget(name)"
                >
                  {{ targetDisplayNames[name] || toLabel(name) }}
                </button>
              </div>
              <div v-else>
                <span class="loading-note" v-if="loadingTargets">Loading…</span>
                <span class="loading-note" v-else>No targets available</span>
              </div>
            </div>

            <!-- Target description -->
            <div v-if="targetDescription" class="target-description">
              {{ targetDescription }}
            </div>

            <!-- Preview selected target curve -->
            <div v-if="selectedTargetPoints.length" class="target-preview">
              <svg viewBox="0 0 800 200" class="response-svg">
                <rect width="800" height="200" fill="#111" rx="6" />
                <path :d="generateTargetPath(selectedTargetPoints)" fill="none" stroke="#58a6ff" stroke-width="2" />
                <line x1="40" y1="100" x2="760" y2="100" stroke="#666" stroke-width="1" stroke-dasharray="5,5"/>
              </svg>
            </div>

            <div class="option-row" v-if="exportMode">
              <label class="option-label">Correction range</label>
              <div class="control-inline">
                <input type="number" v-model.number="rangeMin" min="10" max="25000" step="1" class="number-input" />
                <span class="suffix">Hz</span>
                <span class="sep">–</span>
                <input type="number" v-model.number="rangeMax" min="20" max="25000" step="1" class="number-input" />
                <span class="suffix">Hz</span>
              </div>
            </div>

            <div class="option-row" v-if="exportMode">
              <label class="option-label">Limits</label>
              <div class="control-inline">
                <span class="prefix">Max boost</span>
                <input type="number" v-model.number="maxBoost" min="0" max="18" step="0.5" class="number-input" />
                <span class="suffix">dB</span>
                <span class="spacer"></span>
                <span class="prefix">Max cut</span>
                <input type="number" v-model.number="maxCut" min="0" max="24" step="0.5" class="number-input" />
                <span class="suffix">dB</span>
              </div>
            </div>

          </div>
        </div>

        <!-- Step 3: Optimisation Setup -->
        <div v-if="currentStep === 3" class="step-content">
          <div class="step-header">
            <AppIcon icon="tabler/settings-cog" class="step-icon" />
            <div class="step-info">
              <h3>Step 3: Optimisation Setup</h3>
              <p>Configure optimisation settings before running the analysis.</p>
            </div>
          </div>

          <div class="eq-options">
            <!-- Optimizer preset selection -->
            <div class="option-row">
              <label class="option-label">Optimizer preset</label>
              <div class="control-inline">
                <select class="select-input" v-model="optimizerPreset">
                  <option v-for="name in optimizerPresetOptions" :key="name" :value="name">{{ name }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: Run Optimisation -->
        <div v-if="currentStep === 4" class="step-content">
          <div class="step-header">
            <AppIcon icon="tabler/sliders" class="step-icon" />
            <div class="step-info">
              <h3>Step 4: Run Optimisation</h3>
              <p>Run optimisation to generate filters based on your measurement and target.</p>
            </div>
          </div>

          <!-- Show initial frequency response -->
          <div class="frequency-response-section">
            <h4>Initial Frequency Response</h4>
            <div class="frequency-response-chart">
              <svg viewBox="0 0 800 300" class="response-svg">
                <defs>
                  <pattern id="grid-opt" width="40" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#444" stroke-width="0.5"/>
                  </pattern>
                </defs>
                <rect width="800" height="300" fill="url(#grid-opt)" />

                <!-- Frequency axis (20Hz - 20kHz) -->
                <g class="frequency-axis">
                  <text x="50" y="290" text-anchor="middle" class="axis-label">20</text>
                  <text x="200" y="290" text-anchor="middle" class="axis-label">100</text>
                  <text x="400" y="290" text-anchor="middle" class="axis-label">1k</text>
                  <text x="600" y="290" text-anchor="middle" class="axis-label">10k</text>
                  <text x="750" y="290" text-anchor="middle" class="axis-label">20k</text>
                </g>

                <!-- Magnitude axis (-10dB to +10dB) -->
                <g class="magnitude-axis">
                  <text x="20" y="270" text-anchor="middle" class="axis-label">-10</text>
                  <text x="20" y="220" text-anchor="middle" class="axis-label">-5</text>
                  <text x="20" y="150" text-anchor="middle" class="axis-label">0</text>
                  <text x="20" y="80" text-anchor="middle" class="axis-label">+5</text>
                  <text x="20" y="30" text-anchor="middle" class="axis-label">+10</text>
                </g>

                <!-- Initial measurement curve -->
                <path :d="generateOptimisationPath(measurement)" fill="none" stroke="#4CAF50" stroke-width="2" />

                <!-- Target curve -->
                <path v-if="selectedTargetPoints.length" :d="generateOptimisationPath({ frequencies: selectedTargetPoints.map(p => p[0]), magnitudes: selectedTargetPoints.map(p => p[1]) })" fill="none" stroke="#58a6ff" stroke-width="2" stroke-dasharray="5,5" />

                <!-- Optimized curve (shown during/after optimization) -->
                <path v-if="optimizedResponse" :d="generateOptimisationPath(optimizedResponse)" fill="none" stroke="#ff6b35" stroke-width="2" />

                <!-- 0 dB reference line -->
                <line x1="40" y1="150" x2="760" y2="150" stroke="#666" stroke-width="1" stroke-dasharray="3,3"/>
              </svg>
            </div>

            <!-- Legend -->
            <div class="chart-legend">
              <div class="legend-item">
                <div class="legend-line" style="background: #4CAF50;"></div>
                <span>Initial Response</span>
              </div>
              <div class="legend-item" v-if="selectedTargetPoints.length">
                <div class="legend-line dashed" style="background: #58a6ff;"></div>
                <span>Target Curve</span>
              </div>
              <div class="legend-item" v-if="optimizedResponse">
                <div class="legend-line" style="background: #ff6b35;"></div>
                <span>Optimized Response</span>
              </div>
            </div>
          </div>

          <div class="optimisation">
            <button class="nav-button primary" :disabled="optimising || !canOptimise" @click="runOptimisation">
              {{ optimising ? 'Optimising…' : 'Run optimisation' }}
            </button>
            <div class="opt-status" v-if="optStatus">{{ optStatus }}</div>
            <div class="api-version-error" v-if="apiVersionError">
              <div class="error-header">⚠️ API Version Compatibility Issue</div>
              <div class="error-message">{{ apiVersionError }}</div>
              <div class="error-solution">
                Please update your RoomEQ API to version {{ ROOMEQ_MINIMUM_VERSION }} or higher to use the optimization feature.
              </div>
            </div>
            <div class="opt-progress" v-if="optimising">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${optimisationProgress}%` }"></div>
              </div>
              <div class="progress-text">{{ Math.round(optimisationProgress) }}% complete</div>
              <div class="progress-details" v-if="optCurrentStep">
                <div class="current-step">{{ optCurrentStep }}</div>
                <div class="step-info" v-if="optStepsCompleted && optTotalSteps">
                  Step {{ optStepsCompleted }} of {{ optTotalSteps }}
                </div>
                <div class="timing-info" v-if="optElapsedTime">
                  <span>Elapsed: {{ Math.round(optElapsedTime) }}s</span>
                  <span v-if="optEstimatedRemaining"> • Remaining: {{ Math.round(optEstimatedRemaining) }}s</span>
                </div>
                <div class="filter-info" v-if="optCurrentFilter">
                  Working on {{ optCurrentFilter.filter_type }} filter: {{ optCurrentFilter.frequency.toFixed(0) }}Hz, {{ optCurrentFilter.gain_db.toFixed(1) }}dB, Q={{ optCurrentFilter.q.toFixed(1) }}
                </div>
              </div>
              <div class="optimization-results" v-if="optimisationProgress >= 100 && (optFinalRmsError || optImprovementDb)">
                <div class="result-item" v-if="optFinalRmsError">
                  Final RMS Error: {{ optFinalRmsError.toFixed(2) }}dB
                </div>
                <div class="result-item" v-if="optImprovementDb">
                  Improvement: {{ optImprovementDb.toFixed(1) }}dB
                </div>
              </div>
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
          <div class="step-indicator">Step {{ currentStep }} of {{ totalSteps }}</div>
          <button v-if="currentStep < totalSteps" @click="nextStep" class="nav-button primary">Next <AppIcon icon="arrow-right" /></button>
          <button v-else @click="finish" class="nav-button primary">Done <AppIcon icon="checkmark" /></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import AppIcon from './app-icon.vue'
import type { RoomMeasurement } from '@/stores/settings'
import { getRoomEQTargetPresets, type RoomEQTargetPoint } from '@/api/roomeq'

interface Props {
  isOpen: boolean
  measurement: RoomMeasurement | null
  exportMode?: boolean
}

const props = withDefaults(defineProps<Props>(), { exportMode: false })
type TargetCurveName = string

const targets = ref<Record<string, RoomEQTargetPoint[]>>({})
const loadingTargets = ref<boolean>(false)
const targetNames = computed(() => Object.keys(targets.value)) // These are the IDs
const targetDescriptions = ref<Record<string, string>>({})
const targetDisplayNames = ref<Record<string, string>>({}) // Map from ID to display name

const emit = defineEmits<{ close: []; equalisationSetup: [{
  targetCurve: TargetCurveName
  targetCurvePoints: RoomEQTargetPoint[]
  range: { min: number; max: number }
  limits: { maxBoost: number; maxCut: number }
}] }>()

const measurement = computed(() => props.measurement)

// Steps
const currentStep = ref(1)
const totalSteps = 4

// EQ option state
const targetCurve = ref<TargetCurveName>('')
const rangeMin = ref<number>(20)
const rangeMax = ref<number>(25000)
const maxBoost = ref<number>(6)
const maxCut = ref<number>(12)
const exportMode = computed(() => props.exportMode === true)
const targetDescription = computed(() => targetDescriptions.value[targetCurve.value] || '')

watch(measurement, (m) => {
  if (m?.frequency_range) {
    rangeMin.value = Math.max(10, Math.floor(m.frequency_range[0]))
  rangeMax.value = Math.min(25000, Math.ceil(m.frequency_range[1]))
  }
})

const handleOverlayClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) closeWizard()
}

const closeWizard = () => {
  emit('close')
  reset()
}

const reset = () => {
  currentStep.value = 1
  // pick first available target after load
  targetCurve.value = targetNames.value[0] ?? ''
  rangeMin.value = 20
  rangeMax.value = 20000
  maxBoost.value = 6
  maxCut.value = 12
  optimizerPreset.value = 'Default'
}

const nextStep = () => {
  if (currentStep.value < totalSteps) currentStep.value++
}
const previousStep = () => {
  if (currentStep.value > 1) currentStep.value--
}
const finish = () => {
  emit('equalisationSetup', {
    targetCurve: targetCurve.value,
    targetCurvePoints: targets.value[targetCurve.value],
    range: { min: rangeMin.value, max: rangeMax.value },
  limits: { maxBoost: maxBoost.value, maxCut: maxCut.value }
  })
  closeWizard()
}

const loadTargets = async () => {
  try {
    loadingTargets.value = true
    const resp = await getRoomEQTargetPresets()
    console.log('Raw target presets response:', resp)
    if (resp.success && resp.data) {
      const data = resp.data
      console.log('Target presets data:', data)
      const dict: Record<string, RoomEQTargetPoint[]> = {}
      const descs: Record<string, string> = {}
      const displayNames: Record<string, string> = {}

      // Handle the new API format with target_curves array
      if (data.target_curves && Array.isArray(data.target_curves)) {
        for (const targetCurve of data.target_curves) {
          if (targetCurve && typeof targetCurve === 'object') {
            const key = targetCurve.key
            const name = targetCurve.name || toLabel(key || 'unknown')
            const description = targetCurve.description || ''
            const curve = targetCurve.curve || []

            if (!key) {
              console.error('Target curve missing required "key" field:', targetCurve)
              continue
            }

            if (Array.isArray(curve)) {
              dict[key] = curve as RoomEQTargetPoint[]
              displayNames[key] = name
              if (description) {
                descs[key] = description
              }
            }
          }
        }

        if (Object.keys(dict).length === 0) {
          throw new Error('No valid target curves found - all curves are missing required "key" field')
        }
      }

      targets.value = dict
      targetDescriptions.value = descs
      targetDisplayNames.value = displayNames

      console.log('Parsed targets dict:', dict)
      console.log('Sample target curve data:', Object.keys(dict)[0], dict[Object.keys(dict)[0]])
      console.log('Display names:', displayNames)

      // Prefer 'flat' if available, otherwise first key
      if (!targetCurve.value) {
        targetCurve.value = (dict && 'flat' in dict) ? 'flat' : (Object.keys(dict)[0] ?? '')
      }
    } else {
      console.error('Failed to load EQ targets:', resp.detail)
      targets.value = {}
      targetDescriptions.value = {}
      targetDisplayNames.value = {}
    }
  } catch (e) {
    console.error('Error loading EQ targets:', e)
    targets.value = {}
    targetDescriptions.value = {}
    targetDisplayNames.value = {}
  } finally {
    loadingTargets.value = false
  }
}

const toLabel = (name: string) => name.replace(/_/g, ' ')
const selectTarget = (name: string) => { targetCurve.value = name }

const selectedTargetPoints = computed(() => {
  const points = targets.value[targetCurve.value] || []
  console.log('Selected target points for', targetCurve.value, ':', points)
  return points
})

onMounted(() => {
  loadTargets()
  loadOptimizerPresets()
})

// Reload targets when the modal opens (in case base URL or server changed)
watch(() => props.isOpen, (open) => {
  if (open) {
    loadTargets()
  loadOptimizerPresets()
  }
})

// Chart path generator based on saved measurement
const generatePath = (m: RoomMeasurement): string => {
  if (!m.frequencies || !m.magnitudes) return ''

  const minFreq = 20
  const maxFreq = 25000
  const minMag = -30
  const maxMag = 30
  const width = 760 - 40
  const height = 280 - 20

  const logScale = (freq: number) => 40 + (Math.log10(freq / minFreq) / Math.log10(maxFreq / minFreq)) * width
  const magScale = (mag: number) => 20 + (maxMag - mag) / (maxMag - minMag) * height

  let path = ''
  for (let i = 0; i < m.frequencies.length; i++) {
    const f = m.frequencies[i]
    const mag = m.magnitudes[i]
    if (f >= minFreq && f <= maxFreq) {
      const x = logScale(f)
      const y = magScale(mag)
      path = path === '' ? `M ${x} ${y}` : `${path} L ${x} ${y}`
    }
  }
  return path
}

// Draw the selected target curve points as a simple path
const generateTargetPath = (pts: RoomEQTargetPoint[]): string => {
  if (!pts || !pts.length) return ''
  const minFreq = 20
  const maxFreq = 25000
  // Preview scale: +/-5 dB as requested
  const minMag = -5
  const maxMag = 5
  const width = 760 - 40
  const height = 180 - 20
  const logScale = (freq: number) => 40 + (Math.log10(freq / minFreq) / Math.log10(maxFreq / minFreq)) * width
  const magScale = (mag: number) => 10 + (maxMag - mag) / (maxMag - minMag) * height
  let path = ''
  for (const p of pts) {
    // Add defensive checks to ensure p is an array or has the expected structure
    if (!p || !Array.isArray(p) || p.length < 2) {
      console.warn('Invalid target curve point:', p)
      continue
    }
    const [f, mag] = p as [number, number]
    if (f >= minFreq && f <= maxFreq) {
      const x = logScale(f)
      const y = magScale(mag)
      path = path === '' ? `M ${x} ${y}` : `${path} L ${x} ${y}`
    }
  }
  return path
}

// Generate optimisation chart path with 20Hz-20kHz range and ±10dB scale
const generateOptimisationPath = (data: { frequencies: number[]; magnitudes: number[] } | RoomMeasurement | null): string => {
  if (!data) return ''

  let frequencies: number[]
  let magnitudes: number[]

  if ('frequencies' in data && 'magnitudes' in data) {
    frequencies = data.frequencies
    magnitudes = data.magnitudes
  } else {
    return ''
  }

  const minFreq = 20
  const maxFreq = 20000
  const minMag = -10
  const maxMag = 10
  const width = 760 - 40
  const height = 280 - 20

  const logScale = (freq: number) => 40 + (Math.log10(freq / minFreq) / Math.log10(maxFreq / minFreq)) * width
  const magScale = (mag: number) => 20 + (maxMag - mag) / (maxMag - minMag) * height

  let path = ''
  for (let i = 0; i < frequencies.length; i++) {
    const f = frequencies[i]
    const mag = magnitudes[i]
    if (f >= minFreq && f <= maxFreq) {
      const x = logScale(f)
      const y = magScale(mag)
      path = path === '' ? `M ${x} ${y}` : `${path} L ${x} ${y}`
    }
  }
  return path
}

// Optimisation step - Updated for new API
import {
  startRoomEQOptimization,
  getRoomEQOptimizationStatus,
  getRoomEQOptimizationResult,
  getRoomEQOptimizerPresets,
  checkRoomEQVersionRequirement,
  ROOMEQ_MINIMUM_VERSION,
  type RoomEQOptimizationRequest
} from '@/api/roomeq'

const optimising = ref(false)
const optStatus = ref('')
const apiVersionError = ref('')
const canOptimise = computed(() => !!measurement.value && selectedTargetPoints.value.length > 0)
const optimizerPreset = ref('default')
const optimizerPresetOptions = ref<string[]>(['default'])
const optimizedResponse = ref<{ frequencies: number[]; magnitudes: number[] } | null>(null)
const optimisationProgress = ref(0)
const currentOptimizationId = ref<string | null>(null)
const optCurrentStep = ref('')
const optStepsCompleted = ref(0)
const optTotalSteps = ref(0)
const optElapsedTime = ref(0)
const optEstimatedRemaining = ref(0)
const optCurrentFilter = ref<{ frequency: number; gain_db: number; q: number; filter_type: string } | null>(null)
const optFinalRmsError = ref(0)
const optImprovementDb = ref(0)
const loadOptimizerPresets = async () => {
  try {
    if (!exportMode.value) {
      optimizerPresetOptions.value = ['default']
      optimizerPreset.value = 'default'
      return
    }
    const resp = await getRoomEQOptimizerPresets()
    if (resp.success && resp.data && resp.data.optimizer_presets && Array.isArray(resp.data.optimizer_presets)) {
      // Extract the keys (IDs) from the optimizer presets
      const presetKeys = resp.data.optimizer_presets.map(preset => preset.key)
      optimizerPresetOptions.value = exportMode.value ? presetKeys : ['default']
      if (!optimizerPresetOptions.value.includes(optimizerPreset.value)) {
        optimizerPreset.value = optimizerPresetOptions.value[0] || 'default'
      }
    } else {
      optimizerPresetOptions.value = ['default']
      optimizerPreset.value = 'default'
    }
  } catch {
    optimizerPresetOptions.value = ['default']
    optimizerPreset.value = 'default'
  }
}
const runOptimisation = async () => {
  if (!measurement.value) return

  optimising.value = true
  optimisationProgress.value = 0
  optStatus.value = 'Checking API version…'
  apiVersionError.value = '' // Clear any previous API version errors
  optimizedResponse.value = null
  currentOptimizationId.value = null
  optCurrentStep.value = ''
  optStepsCompleted.value = 0
  optTotalSteps.value = 0
  optFinalRmsError.value = 0
  optImprovementDb.value = 0

  try {
    // Check API version first
    optStatus.value = 'Checking RoomEQ API version…'
    const versionCheck = await checkRoomEQVersionRequirement()
    if (!versionCheck.success) {
      throw new Error(versionCheck.error || `RoomEQ API version ${versionCheck.currentVersion || 'unknown'} is not supported. Minimum required version is ${ROOMEQ_MINIMUM_VERSION}`)
    }

    // If there's a warning (e.g., in dev mode), show it but continue
    if (versionCheck.error) {
      console.warn('Version check warning:', versionCheck.error)
      optStatus.value = versionCheck.error
      // Wait a moment to show the warning, then continue
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    optStatus.value = 'Starting optimisation…'
    console.log('Using target curve:', targetCurve.value)
    console.log('Available target IDs:', Object.keys(targets.value))
    console.log('Target display names:', targetDisplayNames.value)

    const payload: RoomEQOptimizationRequest = {
      // For now, we'll use FFT data from the measurement
      // In a full implementation, you'd use recording_id if available
      frequencies: measurement.value.frequencies,
      magnitudes: measurement.value.magnitudes,
      sample_rate: measurement.value.sample_rate || 48000,
      target_curve: targetCurve.value, // Now this is already the correct API key
      optimizer_preset: optimizerPreset.value,
      filter_count: 8,
      points_per_octave: 12
    }

    // Start optimization
    const startResp = await startRoomEQOptimization(payload)

    if (!startResp.success || !startResp.data) {
      throw new Error(startResp.detail || 'Failed to start optimization')
    }

    currentOptimizationId.value = startResp.data.optimization_id
    optStatus.value = startResp.data.message
    optTotalSteps.value = 20 // Typical optimization steps

    // Poll for progress updates
    const pollInterval = setInterval(async () => {
      if (!currentOptimizationId.value) {
        clearInterval(pollInterval)
        return
      }

      try {
        const statusResp = await getRoomEQOptimizationStatus(currentOptimizationId.value)

        if (statusResp.success && statusResp.data) {
          const status = statusResp.data
          optimisationProgress.value = status.progress
          optCurrentStep.value = status.current_step
          optStepsCompleted.value = status.steps_completed
          optTotalSteps.value = status.total_steps
          optElapsedTime.value = status.elapsed_time
          optEstimatedRemaining.value = status.estimated_remaining || 0

          if (status.current_filter) {
            optCurrentFilter.value = status.current_filter
          }

          if (status.intermediate_rms_error) {
            optFinalRmsError.value = status.intermediate_rms_error
          }

          if (status.status === 'completed') {
            clearInterval(pollInterval)
            optimisationProgress.value = 100
            optStatus.value = status.message || 'Optimization completed!'
            optFinalRmsError.value = status.final_rms_error || 0
            optImprovementDb.value = status.improvement_db || 0

            // Get the final results with frequency response
            const resultResp = await getRoomEQOptimizationResult(currentOptimizationId.value)
            if (resultResp.success && resultResp.data?.frequency_response) {
              optimizedResponse.value = {
                frequencies: resultResp.data.frequency_response.frequencies,
                magnitudes: resultResp.data.frequency_response.corrected_response
              }
            }

          } else if (status.status === 'error' || status.status === 'failed') {
            clearInterval(pollInterval)
            throw new Error(status.message || 'Optimization failed')
          }
        }
      } catch (pollError) {
        console.error('Error polling optimization status:', pollError)
        // Continue polling - don't stop on temporary errors
      }
    }, 1000) // Poll every second

    // Cleanup timeout after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
      if (optimising.value) {
        optStatus.value = 'Optimization timed out'
        optimising.value = false
      }
    }, 300000)

  } catch (e) {
    optimisationProgress.value = 0
    const errorMessage = (e as Error).message

    // Check if this is an API version error
    if (errorMessage.includes('version') && errorMessage.includes(ROOMEQ_MINIMUM_VERSION)) {
      apiVersionError.value = errorMessage
      optStatus.value = `API Version Error`
    } else {
      apiVersionError.value = ''
      optStatus.value = `Optimisation error: ${errorMessage}`
    }
    optimising.value = false
  }
}
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  inset: 0;
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

    &:disabled { opacity: 0.5; cursor: not-allowed; }
    &.secondary { background: var(--color-bg-secondary); color: var(--color-body); border: 1px solid var(--color-border); }
    &.secondary:hover:not(:disabled) { background: var(--color-border); }
    &.primary { background: var(--primary); color: white; }
    &.primary:hover:not(:disabled) { background: var(--primary-dark, var(--primary)); opacity: 0.9; }
    svg { width: 16px; height: 16px; }
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px 20px 32px;
  border-bottom: 1px solid var(--color-border);

  h2 { margin: 0; color: var(--color-head); font-size: 1.5rem; font-weight: 600; }
  .close-button { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: transparent; border: none; border-radius: 6px; cursor: pointer; color: var(--color-body-secondary); transition: all 0.2s ease; }
  .close-button:hover { background: var(--color-bg-secondary); color: var(--color-head); }
  .close-button svg { width: 18px; height: 18px; }
}

.modal-body { flex: 1; overflow-y: auto; padding: 32px; }

.step-content {
  .step-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
  .step-icon { width: 48px; height: 48px; color: var(--primary); flex-shrink: 0; margin-top: 4px; }
  .step-info { flex: 1; }
  .step-info h3 { margin: 0 0 8px 0; color: var(--color-head); font-size: 1.375rem; font-weight: 600; }
  .step-info p { margin: 0; color: var(--color-body-secondary); font-size: 1rem; line-height: 1.5; }
}

.analysis-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.analysis-header h4 { margin: 0; color: var(--color-head); font-size: 1.125rem; font-weight: 600; }
.analysis-header .meta { color: var(--color-body-secondary); font-size: 0.85rem; display: flex; gap: 12px; }

.response-svg { width: 100%; height: 300px; background: #111; border-radius: 6px; }
.axis-label { fill: #999; font-size: 10px; }

.eq-options {
  display: grid; gap: 14px;
  .option-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .option-label { color: var(--color-head); font-weight: 500; white-space: nowrap; }
  .segmented { display: inline-flex; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 6px; overflow: hidden; }
  .segmented-btn { padding: 6px 10px; background: transparent; border: none; color: var(--color-body); cursor: pointer; font-weight: 500; }
  .segmented-btn.active { background: var(--primary); color: white; }
  .control-inline { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .number-input, .select-input { background: var(--background-card); border: 1px solid var(--color-border); border-radius: 6px; color: var(--color-head); padding: 6px 8px; min-width: 90px; }
  .suffix, .prefix, .sep { color: var(--color-body-secondary); font-size: 0.9rem; }
  .spacer { width: 16px; display: inline-block; }
}

.target-description {
  margin: 6px 0 10px 0;
  color: var(--color-body-secondary);
  font-size: 0.95rem;
}

.modal-footer { padding: 16px 24px 24px 24px; border-top: 1px solid var(--color-border); }
.step-navigation { display: flex; align-items: center; justify-content: space-between; }
.target-preview { margin: 8px 0 14px 0; }
.optimisation { display: flex; align-items: center; gap: 12px; }
.opt-status { color: var(--color-body-secondary); }
.opt-progress {
  .progress-bar {
    width: 200px;
    height: 8px;
    background: var(--color-bg-secondary);
    border-radius: 4px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: var(--primary);
    border-radius: 4px;
    transition: width 0.3s ease;
  }
  .progress-text {
    font-size: 0.9rem;
    color: var(--color-body-secondary);
    font-weight: 500;
  }
  .progress-details {
    margin-top: 8px;
    font-size: 0.85rem;
    color: var(--color-body-secondary);
    line-height: 1.4;
  }
  .current-step {
    color: var(--color-head);
    font-weight: 500;
    margin-bottom: 4px;
  }
  .step-info, .timing-info, .filter-info {
    margin-bottom: 2px;
  }
  .timing-info span {
    margin-right: 4px;
  }
  .filter-info {
    font-family: 'Courier New', monospace;
    color: var(--primary);
  }
  .optimization-results {
    margin-top: 8px;
    padding: 8px;
    background: var(--color-bg-secondary);
    border-radius: 4px;
    .result-item {
      color: var(--color-head);
      font-weight: 600;
      margin-bottom: 2px;
    }
  }

  .api-version-error {
    margin-top: 12px;
    padding: 12px;
    background: #2d1b1b;
    border: 1px solid #ff6b6b;
    border-radius: 6px;
    color: #ffa8a8;

    .error-header {
      font-weight: 600;
      margin-bottom: 6px;
      color: #ff6b6b;
    }

    .error-message {
      font-size: 0.9rem;
      margin-bottom: 8px;
      font-family: 'Courier New', monospace;
    }

    .error-solution {
      font-size: 0.85rem;
      color: #c9c9c9;
      font-style: italic;
    }
  }
}
</style>
