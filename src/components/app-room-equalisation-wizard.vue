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

            <!-- Preview selected target curve with measured overlay (±20 dB scale) -->
            <div v-if="selectedTargetPoints.length" class="target-preview">
              <svg viewBox="0 0 800 200" class="response-svg">
                <rect width="800" height="200" fill="#111" rx="6" />
                <!-- 0 dB reference line (rendered first, behind curves) -->
                <line x1="40" y1="100" x2="760" y2="100" stroke="#666" stroke-width="1" stroke-dasharray="5,5"/>
                <!-- Measured overlay -->
                <path v-if="measurement" :d="generateStep2MeasuredPath(measurement)" fill="none" stroke="#4CAF50" stroke-width="2" />
                <!-- Target curve (±20 dB scale) -->
                <path :d="generateTargetPath(selectedTargetPoints)" fill="none" stroke="#58a6ff" stroke-width="2" stroke-dasharray="5,5" />
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
              <p>Configure optimisation settings and review frequency response.</p>
            </div>
          </div>

          <!-- Measured Frequency Response Display -->
          <div class="frequency-response-section">
            <h4>Measured Frequency Response</h4>
            <div class="frequency-response-chart">
              <svg viewBox="0 0 800 300" class="response-svg">
                <defs>
                  <pattern id="grid-step3" width="40" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#444" stroke-width="0.5"/>
                  </pattern>
                </defs>
                <rect width="800" height="300" fill="url(#grid-step3)" />

                <!-- Frequency axis (20Hz - 20kHz) -->
                <g class="frequency-axis">
                  <text x="50" y="290" text-anchor="middle" class="axis-label">20</text>
                  <text x="200" y="290" text-anchor="middle" class="axis-label">100</text>
                  <text x="400" y="290" text-anchor="middle" class="axis-label">1k</text>
                  <text x="600" y="290" text-anchor="middle" class="axis-label">10k</text>
                  <text x="750" y="290" text-anchor="middle" class="axis-label">20k</text>
                </g>

                <!-- Magnitude axis (-20dB to +20dB) -->
                <g class="magnitude-axis">
                  <text x="20" y="285" text-anchor="middle" class="axis-label">-20</text>
                  <text x="20" y="235" text-anchor="middle" class="axis-label">-10</text>
                  <text x="20" y="185" text-anchor="middle" class="axis-label">-5</text>
                  <text x="20" y="150" text-anchor="middle" class="axis-label">0</text>
                  <text x="20" y="115" text-anchor="middle" class="axis-label">+5</text>
                  <text x="20" y="65" text-anchor="middle" class="axis-label">+10</text>
                  <text x="20" y="15" text-anchor="middle" class="axis-label">+20</text>
                </g>

                <!-- 0 dB reference line -->
                <line x1="40" y1="150" x2="760" y2="150" stroke="#666" stroke-width="1" stroke-dasharray="3,3" />

                <!-- Measured frequency response curve -->
        <path v-if="measurement"
          :d="generateMeasuredPath(measurement)"
          fill="none"
          stroke="#4CAF50"
          stroke-width="2" />

                <!-- Usable frequency range indicators -->
                <g v-if="userMinFrequency && userMaxFrequency">
                  <!-- Low frequency limit line -->
                  <line :x1="frequencyToX(userMinFrequency || 20)"
                        y1="20"
                        :x2="frequencyToX(userMinFrequency || 20)"
                        y2="280"
                        stroke="#ff6b6b"
                        stroke-width="2"
                        stroke-dasharray="5,5" />
                  <text :x="frequencyToX(userMinFrequency || 20)"
                        y="12"
                        text-anchor="middle"
                        class="range-label"
                        fill="#ff6b6b">
                    {{ Math.round(userMinFrequency || 20) }}Hz
                  </text>

                  <!-- High frequency limit line -->
      <line :x1="frequencyToX(userMaxFrequency || 20000)"
                        y1="20"
        :x2="frequencyToX(userMaxFrequency || 20000)"
                        y2="280"
                        stroke="#ff6b6b"
                        stroke-width="2"
                        stroke-dasharray="5,5" />
      <text :x="frequencyToX(userMaxFrequency || 20000)"
                        y="12"
                        text-anchor="middle"
                        class="range-label"
                        fill="#ff6b6b">
        {{ Math.round(userMaxFrequency || 20000) }}Hz
                  </text>
                </g>
              </svg>
            </div>
          </div>

          <!-- Usable Frequency Range Controls -->
          <div class="usable-range-controls">
            <div class="range-header">
              <h4>Usable Frequency Range</h4>
              <div class="range-status">
                <span v-if="loadingUsableRange" class="status-loading">
                  <AppIcon icon="tabler/loader" class="spinning" /> Detecting...
                </span>
                <span v-else-if="usableRangeError" class="status-error">
                  <AppIcon icon="tabler/alert-circle" /> {{ usableRangeError }}
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
                      <AppIcon icon="caret-up" :width="14" :height="14" />
                    </button>
                    <button type="button" class="step-btn" @click.prevent="stepLog('min','down')" title="Decrease (1/6 octave)">
                      <AppIcon icon="caret-down" :width="14" :height="14" />
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
                      <AppIcon icon="caret-up" :width="14" :height="14" />
                    </button>
                    <button type="button" class="step-btn" @click.prevent="stepLog('max','down')" title="Decrease (1/6 octave)">
                      <AppIcon icon="caret-down" :width="14" :height="14" />
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

                <!-- Target curve (clipped to min/max optimizer frequencies) -->
                <path v-if="selectedTargetPoints.length" :d="generateOptimisationTargetClippedPath(selectedTargetPoints, userMinFrequency, userMaxFrequency)" fill="none" stroke="#58a6ff" stroke-width="2" stroke-dasharray="5,5" />

                <!-- Optimized curve (shown during/after optimization) -->
                <path v-if="optimizedResponse" :d="generateOptimisationPath(optimizedResponse)" fill="none" stroke="#ff6b35" stroke-width="2" />

                <!-- 0 dB reference line -->
                <line x1="40" y1="150" x2="760" y2="150" stroke="#666" stroke-width="1" stroke-dasharray="3,3"/>
              </svg>
            </div>
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
            <AppIcon icon="tabler/info-circle" class="info-icon" />
            <p>No correction filters were generated. The optimization process may still be running or no filters were needed.</p>
          </div>

          <div v-else class="filters-section">
            <!-- Frequency Response with Filters Applied -->
            <div class="corrected-response-section">
              <h4>Corrected Frequency Response</h4>
              <div class="frequency-response-chart">
                <svg viewBox="0 0 800 300" class="response-svg">
                  <defs>
                    <pattern id="grid-corrected" width="40" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#444" stroke-width="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="800" height="300" fill="url(#grid-corrected)" />

                  <!-- Frequency axis -->
                  <g class="frequency-axis">
                    <text x="50" y="290" text-anchor="middle" class="axis-label">20</text>
                    <text x="200" y="290" text-anchor="middle" class="axis-label">100</text>
                    <text x="400" y="290" text-anchor="middle" class="axis-label">1k</text>
                    <text x="600" y="290" text-anchor="middle" class="axis-label">10k</text>
                    <text x="750" y="290" text-anchor="middle" class="axis-label">20k</text>
                  </g>

                  <!-- Magnitude axis -->
                  <g class="magnitude-axis">
                    <text x="20" y="270" text-anchor="middle" class="axis-label">-10</text>
                    <text x="20" y="220" text-anchor="middle" class="axis-label">-5</text>
                    <text x="20" y="150" text-anchor="middle" class="axis-label">0</text>
                    <text x="20" y="80" text-anchor="middle" class="axis-label">+5</text>
                    <text x="20" y="30" text-anchor="middle" class="axis-label">+10</text>
                  </g>

                  <!-- Original measurement (faded) -->
                  <path :d="generateOptimisationPath(measurement)" fill="none" stroke="#4CAF50" stroke-width="1.5" opacity="0.4" />

                  <!-- Target curve (dashed) -->
                  <path v-if="selectedTargetPoints.length" :d="generateOptimisationTargetClippedPath(selectedTargetPoints, userMinFrequency, userMaxFrequency)" fill="none" stroke="#58a6ff" stroke-width="2" stroke-dasharray="5,5" />

                  <!-- Corrected response (highlighted) -->
                  <path v-if="optimizedResponse" :d="generateOptimisationPath(optimizedResponse)" fill="none" stroke="#ff6b35" stroke-width="2.5" />

                  <!-- 0 dB reference line -->
                  <line x1="40" y1="150" x2="760" y2="150" stroke="#666" stroke-width="1" stroke-dasharray="3,3"/>
                </svg>
              </div>

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
      </div>

      <div class="modal-footer">
        <div class="step-navigation">
          <button v-if="currentStep > 1" @click="previousStep" class="nav-button secondary">
            <AppIcon icon="arrow-left" />
            Previous
          </button>
          <div class="step-indicator">Step {{ currentStep }} of {{ totalSteps }}</div>
          <button v-if="currentStep < totalSteps" @click="nextStep" class="nav-button primary"
                  :disabled="currentStep === 4 && !canProceedToStep5">
            {{ currentStep === 3 ? 'Start' : currentStep === 4 && !canProceedToStep5 ? 'Processing...' : 'Next' }}
            <AppIcon icon="arrow-right" />
          </button>
          <button v-else @click="finish" :disabled="optimising" class="nav-button primary">Done <AppIcon icon="checkmark" /></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import AppIcon from './app-icon.vue'
import type { RoomMeasurement } from '@/stores/settings'
import { getRoomEQTargetPresets, type RoomEQTargetPoint, detectUsableFrequencyRange, type RoomEQUsableRangeResult } from '@/api/roomeq'

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
const totalSteps = 5

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
  addLowpass.value = false
  addHighpass.value = false

  // Reset usable frequency range detection
  usableRangeResult.value = null
  loadingUsableRange.value = false
  usableRangeError.value = ''
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

// Detect usable frequency range from measurement
// Define interfaces for the actual server response structure
interface UsableRangeServerResponse {
  success: boolean
  message?: string
  usable_frequency_range?: {
    min_frequency?: number
    max_frequency?: number
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
          usable_freq_low: range.min_frequency || range.usable_freq_low || userMinFrequency.value,
          usable_freq_high: range.max_frequency || range.usable_freq_high || userMaxFrequency.value,
          recommended_min: Math.max(30, range.recommended_min || range.min_frequency || userMinFrequency.value),
          recommended_max: range.recommended_max || range.max_frequency || userMaxFrequency.value,
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
  const maxFreq = 20000
  // Preview scale: ±20 dB to match Steps 1 and 3
  const minMag = -20
  const maxMag = 20
  const width = 760 - 40
  const height = 180 - 20
  const logScale = (freq: number) => 40 + (Math.log10(freq / minFreq) / Math.log10(maxFreq / minFreq)) * width
  const magScale = (mag: number) => 10 + (maxMag - mag) / (maxMag - minMag) * height

  // Ensure points are sorted by frequency
  const points = [...pts]
    .filter(p => p && typeof p === 'object')
    .sort((a, b) => a.frequency - b.frequency)

  let path = ''
  let drawing = false

  const addPoint = (f: number, db: number, move = false) => {
    const x = logScale(f)
    const y = magScale(db)
    path = !drawing || move || path === '' ? `${path}${path ? ' ' : ''}M ${x} ${y}` : `${path} L ${x} ${y}`
    drawing = true
  }

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]
    const p1 = points[i]
    let f0 = p0.frequency
  const f1 = p1.frequency
    let y0 = p0.target_db
  const y1 = p1.target_db

    // Skip zero/negative frequencies safely
    if (f0 <= 0 || f1 <= 0) continue

    const in0 = f0 >= minFreq && f0 <= maxFreq
    const in1 = f1 >= minFreq && f1 <= maxFreq

    // If segment entirely to the left or right, check crossings
    if (!in0 || !in1) {
      // Compute potential intersections at min/max if segment crosses
      const crossesMin = (f0 < minFreq && f1 > minFreq) || (f1 < minFreq && f0 > minFreq)
      const crossesMax = (f0 < maxFreq && f1 > maxFreq) || (f1 < maxFreq && f0 > maxFreq)

      // Both outside and no crossing with visible range -> end current drawing
      if (!in0 && !in1 && !crossesMin && !crossesMax) {
        drawing = false
        continue
      }

      // If crossing min boundary, add interpolated point at minFreq
      if (crossesMin) {
        const t = (minFreq - f0) / (f1 - f0)
        const y = y0 + t * (y1 - y0)
        addPoint(minFreq, y, !drawing)
        // Clamp start to min
        f0 = minFreq
        y0 = y
      }
      // If crossing max boundary, we'll end at max
      if (crossesMax) {
        const t = (maxFreq - f0) / (f1 - f0)
        const y = y0 + t * (y1 - y0)
        if (in0) {
          // Draw from in-range point to max boundary
          addPoint(f0, y0, !drawing)
        } else if (!drawing) {
          addPoint(minFreq, y0, true) // ensure a move exists if needed (safety)
        }
        addPoint(maxFreq, y)
        drawing = false
        continue
      }

      // If one point is inside (and not crossing max), connect to the inside point, possibly after adding min boundary
      if (in0 && !in1) {
        addPoint(f0, y0, !drawing)
        // Compute intersection at either max or min (we handled crossings above); if f1 > maxFreq, truncate at max
        const bound = f1 > maxFreq ? maxFreq : minFreq
        if (bound === minFreq && f0 > minFreq) {
          // Segment exits below min; compute intersection to min
          const t = (minFreq - f0) / (f1 - f0)
          const y = y0 + t * (y1 - y0)
          addPoint(minFreq, y)
        }
        drawing = false
        continue
      }
      if (!in0 && in1) {
        // Entering visible range
        const t = ((f0 < minFreq ? minFreq : maxFreq) - f0) / (f1 - f0)
        const fEnter = f0 < minFreq ? minFreq : maxFreq
        const yEnter = y0 + t * (y1 - y0)
        addPoint(fEnter, yEnter, !drawing)
        addPoint(f1, y1)
        continue
      }
    }

    // Both points inside: draw normally
    if (in0 && in1) {
      if (!drawing) addPoint(f0, y0, true)
      addPoint(f1, y1)
    }
  }

  return path
}

// Generate measured path for Step 2 preview (800x200, 20–20k Hz, ±20 dB)
const generateStep2MeasuredPath = (m: RoomMeasurement): string => {
  if (!m.frequencies || !m.magnitudes) return ''
  const minFreq = 20
  const maxFreq = 20000
  const minMag = -20
  const maxMag = 20
  const width = 760 - 40
  const height = 180 - 20
  const logScale = (freq: number) => 40 + (Math.log10(freq / minFreq) / Math.log10(maxFreq / minFreq)) * width
  const magScale = (mag: number) => 10 + (maxMag - mag) / (maxMag - minMag) * height

  const freqs = m.frequencies
  const mags = m.magnitudes
  let path = ''
  let drawing = false

  const addPoint = (f: number, db: number, move = false) => {
    const x = logScale(f)
    const y = magScale(db)
    path = !drawing || move || path === '' ? `${path}${path ? ' ' : ''}M ${x} ${y}` : `${path} L ${x} ${y}`
    drawing = true
  }

  for (let i = 1; i < freqs.length; i++) {
    let f0 = freqs[i - 1]
  const f1 = freqs[i]
    let y0 = mags[i - 1]
  const y1 = mags[i]
    if (f0 <= 0 || f1 <= 0) continue

    const in0 = f0 >= minFreq && f0 <= maxFreq
    const in1 = f1 >= minFreq && f1 <= maxFreq

    if (!in0 || !in1) {
      const crossesMin = (f0 < minFreq && f1 > minFreq) || (f1 < minFreq && f0 > minFreq)
      const crossesMax = (f0 < maxFreq && f1 > maxFreq) || (f1 < maxFreq && f0 > maxFreq)

      if (!in0 && !in1 && !crossesMin && !crossesMax) {
        drawing = false
        continue
      }

      if (crossesMin) {
        const t = (minFreq - f0) / (f1 - f0)
        const y = y0 + t * (y1 - y0)
        addPoint(minFreq, y, !drawing)
        f0 = minFreq
        y0 = y
      }
      if (crossesMax) {
        const t = (maxFreq - f0) / (f1 - f0)
        const y = y0 + t * (y1 - y0)
        if (in0) addPoint(f0, y0, !drawing)
        addPoint(maxFreq, y)
        drawing = false
        continue
      }
      if (in0 && !in1) {
        addPoint(f0, y0, !drawing)
        drawing = false
        continue
      }
      if (!in0 && in1) {
        const t = ((f0 < minFreq ? minFreq : maxFreq) - f0) / (f1 - f0)
        const fEnter = f0 < minFreq ? minFreq : maxFreq
        const yEnter = y0 + t * (y1 - y0)
        addPoint(fEnter, yEnter, !drawing)
        addPoint(f1, y1)
        continue
      }
    }

    if (in0 && in1) {
      if (!drawing) addPoint(f0, y0, true)
      addPoint(f1, y1)
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

// Generate target curve for Step 4 clipped to [minFreq, maxFreq] with ±10 dB scale
const generateOptimisationTargetClippedPath = (pts: RoomEQTargetPoint[], minFreqUser: number, maxFreqUser: number): string => {
  if (!pts || !pts.length) return ''
  const chartMinFreq = 20
  const chartMaxFreq = 20000
  const minMag = -10
  const maxMag = 10
  const width = 760 - 40
  const height = 280 - 20
  const logScale = (freq: number) => 40 + (Math.log10(freq / chartMinFreq) / Math.log10(chartMaxFreq / chartMinFreq)) * width
  const magScale = (mag: number) => 20 + (maxMag - mag) / (maxMag - minMag) * height

  const lo = Math.max(chartMinFreq, Math.max(20, Math.floor(minFreqUser || chartMinFreq)))
  const hi = Math.min(chartMaxFreq, Math.min(20000, Math.ceil(maxFreqUser || chartMaxFreq)))
  if (lo >= hi) return ''

  // Sort points by frequency
  const points = [...pts]
    .filter(p => p && typeof p === 'object')
    .sort((a, b) => a.frequency - b.frequency)

  if (points.length === 0) return ''

  // Linear interpolation helper
  const linearInterp = (x: number, x1: number, y1: number, x2: number, y2: number): number => {
    if (x2 === x1) return y1
    return y1 + (y2 - y1) * (x - x1) / (x2 - x1)
  }

  // Process each line segment and clip to frequency range
  const clippedSegments: { freq: number, db: number }[] = []

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    const f1 = p1.frequency
    const f2 = p2.frequency
    const db1 = p1.target_db
    const db2 = p2.target_db

    // Skip invalid segments
    if (f1 <= 0 || f2 <= 0 || f1 === f2) continue

    // Determine clipped segment bounds
    let startFreq = f1
    let endFreq = f2
    let startDb = db1
    let endDb = db2

    // Clip segment to frequency range
    if (startFreq < lo) {
      if (endFreq <= lo) continue // Entire segment is below range
      startDb = linearInterp(lo, f1, db1, f2, db2)
      startFreq = lo
    }

    if (endFreq > hi) {
      if (startFreq >= hi) continue // Entire segment is above range
      endDb = linearInterp(hi, f1, db1, f2, db2)
      endFreq = hi
    }

    // Add clipped segment points
    if (clippedSegments.length === 0 || clippedSegments[clippedSegments.length - 1].freq !== startFreq) {
      clippedSegments.push({ freq: startFreq, db: startDb })
    }
    if (startFreq !== endFreq) {
      clippedSegments.push({ freq: endFreq, db: endDb })
    }
  }

  if (clippedSegments.length === 0) return ''

  // Generate SVG path
  let path = ''
  for (let i = 0; i < clippedSegments.length; i++) {
    const point = clippedSegments[i]
    const x = logScale(point.freq)
    const y = magScale(point.db)

    if (i === 0) {
      path = `M ${x} ${y}`
    } else {
      path += ` L ${x} ${y}`
    }
  }

  return path
}// Helper functions for step 3 chart display
const generateMeasuredPath = (m: RoomMeasurement): string => {
  if (!m.frequencies || !m.magnitudes) return ''

  const minFreq = 20
  const maxFreq = 20000
  const minMag = -20
  const maxMag = 20
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

// Convert frequency to X coordinate on the chart
const frequencyToX = (freq: number): number => {
  const minFreq = 20
  const maxFreq = 20000
  const width = 760 - 40
  return 40 + (Math.log10(freq / minFreq) / Math.log10(maxFreq / minFreq)) * width
}

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
                console.log('� WIZARD: Parsed output data:', outputData)

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
    case 'eq': return 'EQ'
    case 'lp': return 'Low Pass'
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

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
