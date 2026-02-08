<template>
  <WizardModal
    :is-open="isOpen && !!measurement"
    title="Room Equalisation Wizard"
    :current-step="currentStep"
    :total-steps="totalSteps"
    :can-proceed-next="currentStep !== 4 || canProceedToStep5"
    :next-label="currentStep === 3 ? 'Start' : currentStep === 4 && !canProceedToStep5 ? 'Processing...' : 'Next'"
    final-label="Save"
    final-icon="save"
    :saving-final="savingConfiguration"
    @close="closeWizard"
    @next="nextStep"
    @previous="previousStep"
    @finish="saveConfiguration"
  >
        <!-- Step 1: Review Frequency Response -->
        <div v-if="currentStep === 1" class="step-content">
          <div class="step-header">
            <Icon icon="tabler/wave-sine" class="step-icon" />
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
              <FrequencyResponseChart
                grid-pattern-id="grid-eq"
                :chart-config="standardChartConfig"
                :curves="step1Curves"
              />
            </div>
          </div>
        </div>

  <!-- Step 2: Equalisation Options -->
  <div v-if="currentStep === 2" class="step-content">
          <div class="step-header">
            <Icon icon="tabler/settings" class="step-icon" />
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

            <!-- Preview selected target curve with measured overlay (±20 dB scale) -->
            <div v-if="selectedTargetPoints.length" class="target-preview">
              <FrequencyResponseChart
                grid-pattern-id="grid-preview"
                view-box="0 0 800 200"
                :chart-config="previewChartConfig"
                :curves="step2Curves"
                :show-reference-line="true"
              />
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
            <Icon icon="tabler/settings-cog" class="step-icon" />
            <div class="step-info">
              <h3>Step 3: Optimisation Setup</h3>
              <p>Configure optimisation settings and review frequency response.</p>
            </div>
          </div>

          <!-- Measured Frequency Response Display -->
          <div class="frequency-response-section">
            <h4>Measured Frequency Response</h4>
            <FrequencyResponseChart
              grid-pattern-id="grid-step3"
              :chart-config="step3ChartConfig"
              :curves="step3Curves"
              reference-dash-array="3,3"
            >
              <!-- Usable frequency range indicators -->
              <g v-if="userMinFrequency && userMaxFrequency">
                <!-- Low frequency limit line -->
                <line :x1="frequencyToXStep3(userMinFrequency || 20)"
                      y1="20"
                      :x2="frequencyToXStep3(userMinFrequency || 20)"
                      y2="280"
                      stroke="#ff6b6b"
                      stroke-width="2"
                      stroke-dasharray="5,5" />
                <text :x="frequencyToXStep3(userMinFrequency || 20)"
                      y="12"
                      text-anchor="middle"
                      class="range-label"
                      fill="#ff6b6b">
                  {{ Math.round(userMinFrequency || 20) }}Hz
                </text>

                <!-- High frequency limit line -->
    <line :x1="frequencyToXStep3(userMaxFrequency || 20000)"
                      y1="20"
      :x2="frequencyToXStep3(userMaxFrequency || 20000)"
                      y2="280"
                      stroke="#ff6b6b"
                      stroke-width="2"
                      stroke-dasharray="5,5" />
    <text :x="frequencyToXStep3(userMaxFrequency || 20000)"
                      y="12"
                      text-anchor="middle"
                      class="range-label"
                      fill="#ff6b6b">
      {{ Math.round(userMaxFrequency || 20000) }}Hz
                </text>
              </g>
            </FrequencyResponseChart>
          </div>

          <!-- Usable Frequency Range Controls -->
          <div class="usable-range-controls">
            <div class="range-header">
              <h4>Usable Frequency Range</h4>
              <div class="range-status">
                <span v-if="loadingUsableRange" class="status-loading">
                  <Icon icon="tabler/loader" class="spinning" /> Detecting...
                </span>
                <span v-else-if="usableRangeError" class="status-error">
                  <Icon icon="tabler/alert-circle" /> {{ usableRangeError }}
                </span>
              </div>
            </div>

            <!-- Range input controls -->
            <div class="range-inputs">
              <div class="input-group">
                <label>Minimum Frequency</label>
                <div class="control-inline">
        <input class="number-input" type="number" step="any"
                         v-model.number="userMinFrequency"
                         :min="10"
          :max="1000"
          @keydown="onLogStepKeydown('min', $event)" />
                  <div class="stepper" aria-hidden="true">
                    <button type="button" class="step-btn" @click.prevent="stepLog('min','up')" title="Increase (1/6 octave)">
                      <Icon icon="caret-up" :width="14" :height="14" />
                    </button>
                    <button type="button" class="step-btn" @click.prevent="stepLog('min','down')" title="Decrease (1/6 octave)">
                      <Icon icon="caret-down" :width="14" :height="14" />
                    </button>
                  </div>
                  <span class="suffix">Hz</span>
                </div>
              </div>
              <div class="input-group">
                <label>Maximum Frequency</label>
                <div class="control-inline">
        <input class="number-input" type="number" step="any"
                         v-model.number="userMaxFrequency"
                         :min="1000"
          :max="25000"
          @keydown="onLogStepKeydown('max', $event)" />
                  <div class="stepper" aria-hidden="true">
                    <button type="button" class="step-btn" @click.prevent="stepLog('max','up')" title="Increase (1/6 octave)">
                      <Icon icon="caret-up" :width="14" :height="14" />
                    </button>
                    <button type="button" class="step-btn" @click.prevent="stepLog('max','down')" title="Decrease (1/6 octave)">
                      <Icon icon="caret-down" :width="14" :height="14" />
                    </button>
                  </div>
                  <span class="suffix">Hz</span>
                </div>
              </div>
            </div>

            <!-- Range analysis info -->
            <div v-if="usableRangeResult" class="range-analysis">
              <div class="analysis-item">
                <span class="label">Recommended:</span>
                <span class="value">{{ Math.round(usableRangeResult.recommended_min || 20) }}Hz - {{ Math.round(usableRangeResult.recommended_max || 20000) }}Hz</span>
              </div>
            </div>
          </div>

          <div class="eq-options">
            <!-- Additional filter options -->
            <div class="option-row">
              <label class="option-label">Add low-pass filter</label>
              <div class="control-inline">
                <input id="add-lowpass" type="checkbox" v-model="addLowpass" />
              </div>
            </div>

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
            <Icon icon="tabler/sliders" class="step-icon" />
            <div class="step-info">
              <h3>Step 4: Run Optimisation</h3>
              <p>Run optimisation to generate filters based on your measurement and target.</p>
            </div>
          </div>

          <!-- Show initial frequency response -->
          <div class="frequency-response-section">
            <h4>Initial Frequency Response</h4>
            <FrequencyResponseChart
              grid-pattern-id="grid-opt"
              :chart-config="optimisationChartConfig"
              :curves="step4Curves"
              reference-dash-array="3,3"
            />
          </div>

          <div class="optimisation">
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

        <!-- Step 5: Correction Filters -->
        <div v-if="currentStep === 5" class="step-content">
          <div class="step-header">
            <div class="step-info">
              <h3>Step 5: Correction Filters</h3>
              <p>Review the generated correction filters before applying them to your system.</p>
            </div>
          </div>

          <div v-if="optimizedFilters.length === 0" class="no-filters-message">
            <Icon icon="tabler/info-circle" class="info-icon" />
            <p>No correction filters were generated. The optimization process may still be running or no filters were needed.</p>
          </div>

          <div v-else class="filters-section">
            <!-- Frequency Response with Filters Applied -->
            <div class="corrected-response-section">
              <h4>Corrected Frequency Response</h4>
              <FrequencyResponseChart
                grid-pattern-id="grid-corrected"
                :chart-config="optimisationChartConfig"
                :curves="step5Curves"
                reference-dash-array="3,3"
              />

              <div class="chart-legend">
                <div class="legend-item">
                  <div class="legend-color original"></div>
                  <span>Original Measurement</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color target"></div>
                  <span>Target Curve</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color corrected"></div>
                  <span>Corrected Response</span>
                </div>
              </div>
            </div>

            <div class="filters-summary">
              <h4>Filter Summary</h4>
              <div class="summary-stats">
                <div class="stat-item">
                  <span class="stat-label">Total Filters:</span>
                  <span class="stat-value">{{ optimizedFilters.length }}</span>
                </div>
                <div class="stat-item" v-if="optImprovementDb">
                  <span class="stat-label">Improvement:</span>
                  <span class="stat-value">{{ optImprovementDb.toFixed(1) }}dB</span>
                </div>
                <div class="stat-item" v-if="optFinalRmsError">
                  <span class="stat-label">Final RMS Error:</span>
                  <span class="stat-value">{{ optFinalRmsError.toFixed(2) }}dB</span>
                </div>
              </div>
            </div>

            <div class="filters-table">
              <h4>Filter Details</h4>
              <div class="table-container">
                <table class="filters-data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Frequency</th>
                      <th>Q Factor</th>
                      <th>Gain</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(filter, index) in optimizedFilters" :key="index" class="filter-row">
                      <td class="filter-type">
                        <span class="type-badge" :class="filter.filter_type">
                          {{ getFilterTypeLabel(filter.filter_type) }}
                        </span>
                      </td>
                      <td class="filter-frequency">{{ formatFrequency(filter.frequency) }}</td>
                      <td class="filter-q">{{ filter.q.toFixed(2) }}</td>
                      <td class="filter-gain" :class="{ positive: filter.gain_db > 0, negative: filter.gain_db < 0 }">
                        {{ filter.gain_db >= 0 ? '+' : '' }}{{ filter.gain_db.toFixed(1) }}dB
                      </td>
                      <td class="filter-description">{{ filter.description }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 6: Save Configuration -->
        <div v-if="currentStep === 6" class="step-content">
          <div class="step-header">
            <div class="step-info">
              <h3>Step 6: Save Configuration</h3>
              <p>Enter a name for this room correction configuration to save it for future use.</p>
            </div>
          </div>

          <div class="save-configuration-section">
            <div class="config-name-input">
              <label for="config-name">Configuration Name:</label>
              <input
                id="config-name"
                v-model="configName"
                type="text"
                placeholder="e.g., Living Room Correction, Main System EQ"
                maxlength="100"
                class="name-input"
                @keyup.enter="saveConfiguration"
              />
              <div class="input-hint">
                Choose a descriptive name to easily identify this configuration later.
              </div>
            </div>

            <div v-if="optimizedFilters.length > 0" class="save-preview">
              <h4>Configuration Summary</h4>
              <div class="summary-info">
                <div class="info-item">
                  <span class="info-label">Filters:</span>
                  <span class="info-value">{{ optimizedFilters.length }}</span>
                </div>
                <div class="info-item" v-if="optImprovementDb">
                  <span class="info-label">Improvement:</span>
                  <span class="info-value">{{ optImprovementDb.toFixed(1) }}dB</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Frequency Range:</span>
                  <span class="info-value">{{ Math.round(userMinFrequency) }}Hz - {{ Math.round(userMaxFrequency) }}Hz</span>
                </div>
              </div>
            </div>

            <div v-if="saveError" class="error-message">
              <Icon icon="tabler/alert-circle" />
              <span>{{ saveError }}</span>
            </div>

            <div v-if="saveSuccess" class="success-message">
              <Icon icon="tabler/check-circle" />
              <span>Configuration saved successfully as "{{ savedConfigName }}"</span>
            </div>
          </div>
        </div>
  </WizardModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import Icon from '@/components/Icon.vue'
import WizardModal from '@/components/WizardModal.vue'
import FrequencyResponseChart from '@/components/FrequencyResponseChart.vue'
import { CHART_CONFIGS, frequencyToX as frequencyToXHelper } from '@/composables/useChartPaths'
import type { RoomMeasurement } from '@/stores/settings'
import { getRoomEQTargetPresets, type RoomEQTargetPoint, detectUsableFrequencyRange, type RoomEQUsableRangeResult } from '@/api/roomeq'
import { setConfigValue } from '@/api/config'

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
const totalSteps = 6

// EQ option state
const targetCurve = ref<TargetCurveName>('')
const rangeMin = ref<number>(20)
const rangeMax = ref<number>(25000)
const maxBoost = ref<number>(6)
const maxCut = ref<number>(12)
const exportMode = computed(() => props.exportMode === true)
const targetDescription = computed(() => targetDescriptions.value[targetCurve.value] || '')

// Check if optimization is complete and we can proceed to step 5
const canProceedToStep5 = computed(() => {
  return !optimising.value && (optimizedFilters.value.length > 0 || optimisationProgress.value >= 100)
})

// Usable frequency range detection
const usableRangeResult = ref<RoomEQUsableRangeResult | null>(null)
const loadingUsableRange = ref(false)
const usableRangeError = ref('')
const userMinFrequency = ref<number>(20)
const userMaxFrequency = ref<number>(20000)

watch(measurement, (m) => {
  if (m?.frequency_range) {
    rangeMin.value = Math.max(10, Math.floor(m.frequency_range[0]))
  rangeMax.value = Math.min(25000, Math.ceil(m.frequency_range[1]))
  }
})

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
  addLowpass.value = false
  addHighpass.value = false

  // Reset usable frequency range detection
  usableRangeResult.value = null
  loadingUsableRange.value = false
  usableRangeError.value = ''

  // Reset Step 6 variables
  configName.value = ''
  savingConfiguration.value = false
  saveError.value = ''
  saveSuccess.value = false
  savedConfigName.value = ''
}

const nextStep = async () => {
  if (currentStep.value < totalSteps) {
    currentStep.value++
    // Auto-start optimization when reaching step 4
    if (currentStep.value === 4) {
      await runOptimisation()
    }
  }
}
const previousStep = () => {
  if (currentStep.value > 1) currentStep.value--
}

const saveConfiguration = async () => {
  if (!configName.value.trim()) {
    saveError.value = 'Please enter a configuration name'
    return
  }

  if (optimizedFilters.value.length === 0) {
    saveError.value = 'No filters to save'
    return
  }

  try {
    savingConfiguration.value = true
    saveError.value = ''
    saveSuccess.value = false

    // Create the configuration data
    const configData = {
      name: configName.value.trim(),
      filters: optimizedFilters.value,
      measurement: {
        frequencies: measurement.value?.frequencies || [],
        magnitudes: measurement.value?.magnitudes || []
      },
      target_curve: {
        name: targetCurve.value,
        points: selectedTargetPoints.value
      },
      settings: {
        min_frequency: userMinFrequency.value,
        max_frequency: userMaxFrequency.value,
        add_highpass: addHighpass.value,
        add_lowpass: addLowpass.value
      },
      optimization_results: {
        improvement_db: optImprovementDb.value,
        final_rms_error: optFinalRmsError.value,
        steps_completed: optStepsCompleted.value
      },
      created_at: new Date().toISOString()
    }

    // Generate a unique key based on timestamp and name
    const timestamp = Date.now()
    const safeName = configName.value.trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
    const configKey = `correction-filters.${timestamp}.${safeName}`

    // Save to config API
    await setConfigValue(configKey, JSON.stringify(configData))

    // Show success
    saveSuccess.value = true
    savedConfigName.value = configName.value.trim()

    console.log(`✅ Room correction configuration saved as: ${configKey}`)

    // Close the wizard after successful save
    setTimeout(() => {
      closeWizard()
    }, 1000) // Small delay to show the success message

  } catch (error) {
    console.error('Failed to save configuration:', error)
    saveError.value = error instanceof Error ? error.message : 'Failed to save configuration'
  } finally {
    savingConfiguration.value = false
  }
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

      // Handle the documented API format where target_curves is an array
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
          console.error('No valid target curves found')
        }
      } else {
        console.error('target_curves is not in expected array format:', data.target_curves)
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
// Step 3 options used by Step 4
const addLowpass = ref<boolean>(false)
const addHighpass = ref<boolean>(false)

// Step 6: Save Configuration
const configName = ref<string>('')
const savingConfiguration = ref<boolean>(false)
const saveError = ref<string>('')
const saveSuccess = ref<boolean>(false)
const savedConfigName = ref<string>('')

// Detect usable frequency range from measurement
// Define interfaces for the actual server response structure
interface UsableRangeServerResponse {
  success: boolean
  message?: string
  usable_frequency_range?: {
    low_hz?: number           // New API format
    high_hz?: number          // New API format
    min_frequency?: number    // Fallback
    max_frequency?: number    // Fallback
    recommended_min?: number
    recommended_max?: number
    dynamic_range?: number
    low_frequency_rolloff?: number
    high_frequency_rolloff?: number
    noise_floor_estimate?: number
    usable_freq_low?: number
    usable_freq_high?: number
  }
  // Fallback for direct structure
  usable_freq_low?: number
  usable_freq_high?: number
  recommended_min?: number
  recommended_max?: number
  dynamic_range?: number
  low_frequency_rolloff?: number
  high_frequency_rolloff?: number
  noise_floor_estimate?: number
}

const detectUsableRange = async () => {
  if (!measurement.value) return

  try {
    loadingUsableRange.value = true
    usableRangeError.value = ''

    const payload = {
      measured_curve: {
        frequencies: measurement.value.frequencies,
        magnitudes_db: measurement.value.magnitudes
      },
      optimizer_params: {
        min_frequency: userMinFrequency.value,
        max_frequency: userMaxFrequency.value
      },
      sample_rate: measurement.value.sample_rate || 48000
    }

    console.log('🔍 /eq/usable-range request payload:', payload)
    const response = await detectUsableFrequencyRange(payload)
    console.log('🔍 /eq/usable-range response:', response)

    if (response.success && response.data) {
      const data = response.data as UsableRangeServerResponse

      // Extract usable frequency range from the actual response structure
      let extractedResult: RoomEQUsableRangeResult

      if (data.usable_frequency_range) {
        // Server returns nested structure
        const range = data.usable_frequency_range
        extractedResult = {
          success: data.success,
          usable_freq_low: range.low_hz || range.min_frequency || range.usable_freq_low || userMinFrequency.value,
          usable_freq_high: range.high_hz || range.max_frequency || range.usable_freq_high || userMaxFrequency.value,
          recommended_min: Math.max(30, range.low_hz || range.recommended_min || range.min_frequency || userMinFrequency.value),
          recommended_max: range.high_hz || range.recommended_max || range.max_frequency || userMaxFrequency.value,
          message: data.message,
          analysis: {
            dynamic_range: range.dynamic_range || 0,
            low_frequency_rolloff: range.low_frequency_rolloff || 0,
            high_frequency_rolloff: range.high_frequency_rolloff || 0,
            noise_floor_estimate: range.noise_floor_estimate || 0
          }
        }
      } else {
        // Fallback to direct structure
        extractedResult = {
          success: data.success,
          usable_freq_low: data.usable_freq_low || userMinFrequency.value,
          usable_freq_high: data.usable_freq_high || userMaxFrequency.value,
          recommended_min: Math.max(30, data.recommended_min || data.usable_freq_low || userMinFrequency.value),
          recommended_max: data.recommended_max || data.usable_freq_high || userMaxFrequency.value,
          message: data.message,
          analysis: {
            dynamic_range: data.dynamic_range || 0,
            low_frequency_rolloff: data.low_frequency_rolloff || 0,
            high_frequency_rolloff: data.high_frequency_rolloff || 0,
            noise_floor_estimate: data.noise_floor_estimate || 0
          }
        }
      }

      usableRangeResult.value = extractedResult

      // Update the range inputs with recommended values (ensuring minimum is at least 30Hz)
      if (extractedResult.recommended_min) {
        userMinFrequency.value = Math.max(30, extractedResult.recommended_min)
      } else if (extractedResult.usable_freq_low) {
        userMinFrequency.value = Math.max(30, extractedResult.usable_freq_low)
      }
      if (extractedResult.recommended_max || extractedResult.usable_freq_high) {
        userMaxFrequency.value = extractedResult.recommended_max || extractedResult.usable_freq_high || userMaxFrequency.value
      }
      // Preset low-pass checkbox if minimum usable frequency is > 50Hz
      if ((extractedResult.usable_freq_low || 0) > 50) {
        addLowpass.value = true
      }
      // Preset high-pass checkbox if minimum usable frequency is > 40Hz
      if ((extractedResult.usable_freq_low || 0) > 40) {
        addHighpass.value = true
      }
    } else {
      usableRangeError.value = response.detail || 'Failed to detect usable frequency range'
      usableRangeResult.value = null
    }
  } catch (error) {
    console.error('Error detecting usable frequency range:', error)
    usableRangeError.value = error instanceof Error ? error.message : 'Unknown error occurred'
    usableRangeResult.value = null
  } finally {
    loadingUsableRange.value = false
  }
}

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
    // Clear any previous optimization data when opening the wizard
    optimising.value = false
    optStatus.value = ''
    apiVersionError.value = ''
    optimizedResponse.value = null
    optimisationProgress.value = 0
    currentOptimizationId.value = null
    optCurrentStep.value = ''
    optStepsCompleted.value = 0
    optTotalSteps.value = 0
    optElapsedTime.value = 0
    optEstimatedRemaining.value = 0
    optCurrentFilter.value = null
    optFinalRmsError.value = 0
    optImprovementDb.value = 0
    optimizedFilters.value = []
    optimizationTime.value = 0

    // Load fresh data
    loadTargets()
    loadOptimizerPresets()
  }
})

// Auto-detect usable frequency range when entering step 3
watch(currentStep, (newStep) => {
  if (newStep === 3 && measurement.value) {
    detectUsableRange()
  }
})

// Logarithmic stepping for frequency inputs: 1/6 octave increments
const applyLogStep = (which: 'min' | 'max', direction: 'up' | 'down') => {
  const sixthOct = Math.pow(2, 1 / 6)
  const dir = direction === 'up' ? sixthOct : 1 / sixthOct
  if (which === 'min') {
    const current = userMinFrequency.value || 20
    const next = current * dir
    const clamped = Math.max(10, Math.min(next, Math.min(userMaxFrequency.value - 1, 1000)))
    userMinFrequency.value = Math.round(clamped)
  } else {
    const current = userMaxFrequency.value || 20000
    const next = current * dir
    const clamped = Math.min(25000, Math.max(next, Math.max(userMinFrequency.value + 1, 1000)))
    userMaxFrequency.value = Math.round(clamped)
  }
}

// Keyboard handler delegates to applyLogStep
const onLogStepKeydown = (which: 'min' | 'max', e: KeyboardEvent) => {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
  e.preventDefault()
  applyLogStep(which, e.key === 'ArrowUp' ? 'up' : 'down')
}

// Click handler for integrated stepper buttons
const stepLog = (which: 'min' | 'max', direction: 'up' | 'down') => {
  applyLogStep(which, direction)
}

// ── Chart configs ──────────────────────────────────────────────────────
const standardChartConfig = CHART_CONFIGS.standard
const previewChartConfig = CHART_CONFIGS.preview
const step3ChartConfig = CHART_CONFIGS.step3
const optimisationChartConfig = CHART_CONFIGS.optimisation

// Convert frequency to X coordinate for step 3 range indicators
const frequencyToXStep3 = (freq: number): number => {
  return frequencyToXHelper(freq, step3ChartConfig)
}

// ── Curve definitions for FrequencyResponseChart ──────────────────────

// Step 1: single measured curve
const step1Curves = computed(() => {
  const m = measurement.value
  if (!m?.frequencies || !m?.magnitudes) return []
  return [{
    frequencies: m.frequencies,
    magnitudes: m.magnitudes,
    color: '#4CAF50',
    strokeWidth: 2,
  }]
})

// Step 2: measured overlay + target curve
const step2Curves = computed(() => {
  const curves: Array<{
    frequencies: number[]
    magnitudes: number[]
    color: string
    strokeWidth?: number
    dashArray?: string
    isTargetCurve?: boolean
  }> = []
  const m = measurement.value
  if (m?.frequencies && m?.magnitudes) {
    curves.push({
      frequencies: m.frequencies,
      magnitudes: m.magnitudes,
      color: '#4CAF50',
      strokeWidth: 2,
    })
  }
  const pts = selectedTargetPoints.value
  if (pts.length) {
    curves.push({
      frequencies: pts.map(p => p.frequency),
      magnitudes: pts.map(p => p.target_db),
      color: '#58a6ff',
      strokeWidth: 2,
      dashArray: '5,5',
      isTargetCurve: true,
    })
  }
  return curves
})

// Step 3: measured curve (step3 config)
const step3Curves = computed(() => {
  const m = measurement.value
  if (!m?.frequencies || !m?.magnitudes) return []
  return [{
    frequencies: m.frequencies,
    magnitudes: m.magnitudes,
    color: '#4CAF50',
    strokeWidth: 2,
  }]
})

// Step 4: measurement + target (clipped) + optimised response
const step4Curves = computed(() => {
  const curves: Array<{
    frequencies: number[]
    magnitudes: number[]
    color: string
    strokeWidth?: number
    dashArray?: string
    opacity?: number
    isTargetCurve?: boolean
    clipMinFreq?: number
    clipMaxFreq?: number
  }> = []
  const m = measurement.value
  if (m?.frequencies && m?.magnitudes) {
    curves.push({
      frequencies: m.frequencies,
      magnitudes: m.magnitudes,
      color: '#4CAF50',
      strokeWidth: 2,
    })
  }
  const pts = selectedTargetPoints.value
  if (pts.length) {
    curves.push({
      frequencies: pts.map(p => p.frequency),
      magnitudes: pts.map(p => p.target_db),
      color: '#58a6ff',
      strokeWidth: 2,
      dashArray: '5,5',
      isTargetCurve: true,
      clipMinFreq: userMinFrequency.value,
      clipMaxFreq: userMaxFrequency.value,
    })
  }
  if (optimizedResponse.value) {
    curves.push({
      frequencies: optimizedResponse.value.frequencies,
      magnitudes: optimizedResponse.value.magnitudes,
      color: '#ff6b35',
      strokeWidth: 2,
    })
  }
  return curves
})

// Step 5: original (faded) + target (dashed) + corrected
const step5Curves = computed(() => {
  const curves: Array<{
    frequencies: number[]
    magnitudes: number[]
    color: string
    strokeWidth?: number
    dashArray?: string
    opacity?: number
    isTargetCurve?: boolean
    clipMinFreq?: number
    clipMaxFreq?: number
  }> = []
  const m = measurement.value
  if (m?.frequencies && m?.magnitudes) {
    curves.push({
      frequencies: m.frequencies,
      magnitudes: m.magnitudes,
      color: '#4CAF50',
      strokeWidth: 1.5,
      opacity: 0.4,
    })
  }
  const pts = selectedTargetPoints.value
  if (pts.length) {
    curves.push({
      frequencies: pts.map(p => p.frequency),
      magnitudes: pts.map(p => p.target_db),
      color: '#58a6ff',
      strokeWidth: 2,
      dashArray: '5,5',
      isTargetCurve: true,
      clipMinFreq: userMinFrequency.value,
      clipMaxFreq: userMaxFrequency.value,
    })
  }
  if (optimizedResponse.value) {
    curves.push({
      frequencies: optimizedResponse.value.frequencies,
      magnitudes: optimizedResponse.value.magnitudes,
      color: '#ff6b35',
      strokeWidth: 2.5,
    })
  }
  return curves
})

// Optimisation step - Updated for new streaming API
import {
  startNewRoomEQOptimizationStream,
  getRoomEQOptimizerPresets,
  checkRoomEQVersionRequirement,
  ROOMEQ_MINIMUM_VERSION,
  type NewRoomEQOptimizationRequest,
  type NewRoomEQOptimizationProgress,
  type NewRoomEQOptimizedFilter,
  type NewRoomEQOptimizationResult
} from '@/api/roomeq'

const optimising = ref(false)
const optStatus = ref('')
const apiVersionError = ref('')
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
const optimizedFilters = ref<NewRoomEQOptimizedFilter[]>([])
const optimizationTime = ref(0)
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
  optimizedFilters.value = []
  optimizationTime.value = 0

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

    // Build the new API payload format
    const payload: NewRoomEQOptimizationRequest = {
      measured_curve: {
        frequencies: measurement.value.frequencies,
        magnitudes_db: measurement.value.magnitudes
      },
      target_curve: {
        curve: selectedTargetPoints.value.map(point => ({
          frequency: point.frequency,
          target_db: point.target_db,
          weight: point.weight
        }))
      },
      optimizer_params: {
        qmax: 10.0,
        mindb: -10.0,
        maxdb: 3.0,
        add_highpass: addHighpass.value,
  acceptable_error: 1.0,
  min_frequency: userMinFrequency.value,
  max_frequency: userMaxFrequency.value,
  add_lowpass: addLowpass.value
      },
      sample_rate: measurement.value.sample_rate || 48000,
      filter_count: 16
    }

    // Start streaming optimization using the new API
    const streamResult = await startNewRoomEQOptimizationStream(
      payload,
      // onEvent callback
      (event: NewRoomEQOptimizationProgress) => {
        console.log('🎯 WIZARD: Processing optimization event:', event.type, event.message)

        switch (event.type) {
          case 'started':
            console.log('Optimization started')
            optStatus.value = event.message || 'Optimization started'
            optTotalSteps.value = 16 // Default filter count
            optimisationProgress.value = 0
            currentOptimizationId.value = 'new-api' // Placeholder
            optCurrentFilter.value = null
            break

          case 'output':
            console.log('📊 WIZARD: Processing output event')
            // Parse JSON from the line if available
            if (event.line) {
              try {
                const outputData = JSON.parse(event.line)
                console.log('📊 WIZARD: Parsed output data:', outputData)

                // Handle different types of output data
                if (outputData.filters && Array.isArray(outputData.filters)) {
                  // This looks like progress or final result data
                  optimizedFilters.value = outputData.filters
                  optStatus.value = outputData.message || `Generated ${outputData.filters.length} filters`

                  // Calculate progress based on number of filters
                  const filterCount = outputData.filters.length
                  const expectedTotal = 16 // Or parse from payload
                  optimisationProgress.value = Math.min(100, (filterCount / expectedTotal) * 100)
                  optStepsCompleted.value = filterCount

                  // Show current filter being worked on (use the last filter)
                  if (outputData.filters.length > 0) {
                    const lastFilter = outputData.filters[outputData.filters.length - 1]
                    optCurrentFilter.value = {
                      frequency: lastFilter.frequency,
                      gain_db: lastFilter.gain_db,
                      q: lastFilter.q,
                      filter_type: lastFilter.filter_type
                    }
                  }

                  // Update frequency response if available
                  if (outputData.frequency_response && outputData.frequency_response.resulting_response) {
                    optimizedResponse.value = {
                      frequencies: outputData.frequency_response.frequencies,
                      magnitudes: outputData.frequency_response.resulting_response.magnitude_db
                    }
                  }
                } else if (outputData.step !== undefined) {
                  // This is a step progress update
                  optStepsCompleted.value = outputData.step
                  optimisationProgress.value = outputData.progress_percent || 0
                  optStatus.value = outputData.message || `Step ${outputData.step}`
                }
              } catch (parseError) {
                console.warn('Failed to parse output line as JSON:', parseError)
                // Treat as text progress update
                optStatus.value = event.line.substring(0, 100) + (event.line.length > 100 ? '...' : '')
              }
            }
            break

          case 'completed':
            console.log('✅ WIZARD: Optimization completed')
            optimisationProgress.value = 100
            optStatus.value = 'Optimization completed!'
            optCurrentFilter.value = null
            optimising.value = false

            // Parse final result if available in the line
            if (event.line) {
              try {
                const finalResult = JSON.parse(event.line) as NewRoomEQOptimizationResult
                if (finalResult.success && finalResult.filters) {
                  optimizedFilters.value = finalResult.filters
                  optStatus.value = `Optimization completed! Generated ${finalResult.filters.length} filters`
                  optFinalRmsError.value = finalResult.final_error || 0
                  optImprovementDb.value = finalResult.improvement_db || 0
                  optimizationTime.value = finalResult.processing_time_ms || 0
                }
              } catch (parseError) {
                console.warn('Failed to parse completion result:', parseError)
              }
            }
            break

          default:
            console.log('Unknown event type:', event.type)
        }
      },
      // onError callback
      (error: string) => {
        console.error('Optimization error callback:', error)
        apiVersionError.value = ''
        optStatus.value = `Optimization error: ${error}`
        optCurrentFilter.value = null // Clear current filter on error
        optimising.value = false
      },
      // onComplete callback
      (result?: NewRoomEQOptimizationResult) => {
        console.log('Optimization onComplete callback triggered')
        if (result && result.filters) {
          optimizedFilters.value = result.filters
          optFinalRmsError.value = result.final_error || 0
          optImprovementDb.value = result.improvement_db || 0
          optimizationTime.value = result.processing_time_ms || 0
        }
        if (optimising.value) {
          optimising.value = false
        }
      }
    )

    if (!streamResult.success) {
      throw new Error(streamResult.detail || 'Failed to start streaming optimization')
    }

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

// Helper functions for Step 5
const getFilterTypeLabel = (type: string): string => {
  switch (type) {
    case 'hp': return 'High Pass'
    case 'lp': return 'Low Pass'
    case 'eq': return 'EQ'
    case 'highpass': return 'High Pass'
    case 'lowpass': return 'Low Pass'
    case 'peaking': return 'EQ'
    case 'peak': return 'EQ'
    case 'lowshelf': return 'Low Shelf'
    case 'highshelf': return 'High Shelf'
    default: return type.toUpperCase()
  }
}

const formatFrequency = (freq: number): string => {
  if (freq >= 1000) {
    return `${(freq / 1000).toFixed(freq % 1000 === 0 ? 0 : 1)}kHz`
  }
  return `${Math.round(freq)}Hz`
}
</script>

<style scoped lang="scss">
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

// Usable frequency range controls (Step 3)
.usable-range-controls {
  margin: 20px 0;
  padding: 16px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--color-border);

  .range-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h4 {
      margin: 0;
      color: var(--color-head);
    }

    .range-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;

      .status-loading { color: var(--color-text-secondary); }
      .status-error { color: #ff6b6b; }
      .status-success { color: var(--primary); }
      .spinning { animation: spin 1s linear infinite; }
    }
  }

  .range-inputs {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;

    .input-group {
      flex: 1;

      label {
        display: block;
        margin-bottom: 6px;
        font-size: 0.9rem;
        color: var(--color-head);
        font-weight: 500;
      }

      .control-inline { display: inline-flex; align-items: center; gap: 8px; width: 100%; }

      .number-input {
        background: var(--background-card);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        color: var(--color-head);
        padding: 8px 10px;
        min-width: 110px;
        width: 100%;

        &:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
        }
      }

      /* Hide native spinners for a cleaner custom stepper */
      .number-input::-webkit-outer-spin-button,
      .number-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .number-input[type=number] { appearance: textfield; -moz-appearance: textfield; }

      .stepper {
        display: inline-flex;
        flex-direction: column;
        margin-left: 4px;
        gap: 2px;
      }

      .step-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 18px;
        padding: 0;
        border: 1px solid var(--color-border);
        border-radius: 4px;
        background: var(--background-card);
        color: var(--color-head);
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .step-btn:hover { background: var(--color-bg-secondary); }
      .step-btn:active { transform: translateY(1px); }

      .suffix { color: var(--color-body-secondary); }
    }
  }
}

.range-analysis {
  .analysis-item {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid var(--color-border);

    &:last-child { border-bottom: none; }

    .label { color: var(--color-text-secondary); font-size: 0.9rem; }
    .value { color: var(--color-head); font-weight: 500; font-family: 'Courier New', monospace; }
  }
}

  .range-label {
    font-size: 11px;
    font-weight: 600;
  }

  // Step 5 - Filters Section
  .no-filters-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px;
    text-align: center;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 8px;

    .info-icon {
      width: 48px;
      height: 48px;
      color: var(--color-body-secondary);
      margin-bottom: 16px;
    }

    p {
      margin: 0;
      color: var(--color-body-secondary);
      max-width: 400px;
    }
  }

  .filters-section {
    .filters-summary {
      margin-bottom: 24px;
      padding: 20px;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 8px;

      h4 {
        margin: 0 0 16px 0;
        color: var(--color-head);
        font-size: 1.125rem;
        font-weight: 600;
      }

      .summary-stats {
        display: flex;
        gap: 24px;
        flex-wrap: wrap;

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;

          .stat-label {
            font-size: 0.875rem;
            color: var(--color-body-secondary);
          }

          .stat-value {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--color-head);
          }
        }
      }
    }

    .filters-table {
      margin-bottom: 32px;

      h4 {
        margin: 0 0 16px 0;
        color: var(--color-head);
        font-size: 1.125rem;
        font-weight: 600;
      }

      .table-container {
        overflow-x: auto;
        border: 1px solid var(--color-border);
        border-radius: 8px;

        .filters-data-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--color-bg-primary);

          th {
            background: var(--color-bg-secondary);
            padding: 12px 16px;
            text-align: left;
            font-weight: 600;
            color: var(--color-head);
            border-bottom: 1px solid var(--color-border);
            font-size: 0.875rem;
          }

          td {
            padding: 12px 16px;
            border-bottom: 1px solid var(--color-border-light);
            font-size: 0.875rem;

            &.filter-type {
              .type-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;

                &.hp {
                  background: #e3f2fd;
                  color: #1976d2;
                }

                &.eq {
                  background: #f3e5f5;
                  color: #7b1fa2;
                }

                &.lp {
                  background: #e8f5e8;
                  color: #388e3c;
                }
              }
            }

            &.filter-frequency {
              font-family: 'Courier New', monospace;
              font-weight: 600;
            }

            &.filter-q {
              font-family: 'Courier New', monospace;
            }

            &.filter-gain {
              font-family: 'Courier New', monospace;
              font-weight: 600;

              &.positive {
                color: #d32f2f;
              }

              &.negative {
                color: #1976d2;
              }
            }

            &.filter-description {
              color: var(--color-body-secondary);
            }
          }

          tr.filter-row:last-child td {
            border-bottom: none;
          }

          tr.filter-row:nth-child(even) {
            background: var(--color-bg-secondary);
          }
        }
      }
    }

    .corrected-response-section {
      h4 {
        margin: 0 0 16px 0;
        color: var(--color-head);
        font-size: 1.125rem;
        font-weight: 600;
      }

      .chart-legend {
        display: flex;
        gap: 24px;
        margin-top: 16px;
        justify-content: center;
        flex-wrap: wrap;

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          color: var(--color-body);

          .legend-color {
            width: 16px;
            height: 3px;
            border-radius: 2px;

            &.original {
              background: #4CAF50;
              opacity: 0.4;
            }

            &.target {
              background: #58a6ff;
            }

            &.corrected {
              background: #ff6b35;
            }
          }
        }
      }
    }
  }

  // Step 6: Save Configuration Styles
  .save-configuration-section {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 600px;
    margin: 0 auto;

    .config-name-input {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      label {
        font-weight: 600;
        color: var(--text-primary);
      }

      .name-input {
        padding: 0.75rem 1rem;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        font-size: 1rem;
        background: var(--bg-secondary);
        color: var(--text-primary);
        transition: border-color 0.2s, box-shadow 0.2s;

        &:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.1);
        }

        &::placeholder {
          color: var(--text-muted);
        }
      }

      .input-hint {
        font-size: 0.875rem;
        color: var(--text-muted);
      }
    }

    .save-preview {
      padding: 1rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;

      h4 {
        margin: 0 0 0.75rem 0;
        color: var(--text-primary);
        font-size: 1.1rem;
      }

      .summary-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .info-label {
            color: var(--text-muted);
          }

          .info-value {
            font-weight: 600;
            color: var(--text-primary);
          }
        }
      }
    }

    .save-actions {
      display: flex;
      justify-content: center;

      .save-button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 2rem;
        font-size: 1rem;
        font-weight: 600;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.2s, transform 0.1s;

        &.primary {
          background: var(--accent-primary);
          color: white;

          &:hover:not(:disabled) {
            background: var(--accent-primary-hover);
            transform: translateY(-1px);
          }

          &:disabled {
            background: var(--bg-muted);
            color: var(--text-muted);
            cursor: not-allowed;
          }
        }

        .spinning {
          animation: spin 1s linear infinite;
        }
      }
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: rgba(248, 81, 73, 0.1);
      border: 1px solid rgba(248, 81, 73, 0.3);
      border-radius: 8px;
      color: #f85149;

      svg {
        flex-shrink: 0;
        width: 1rem;
        height: 1rem;
      }
    }

    .success-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: rgba(63, 185, 80, 0.1);
      border: 1px solid rgba(63, 185, 80, 0.3);
      border-radius: 8px;
      color: #3fb950;

      svg {
        flex-shrink: 0;
        width: 1rem;
        height: 1rem;
      }
    }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
