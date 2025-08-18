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
                  {{ toLabel(name) }}
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

            <!-- Optimizer preset selection -->
            <div class="option-row">
              <label class="option-label">Optimizer preset</label>
              <div class="control-inline">
                <select class="select-input" v-model="optimizerPreset">
                  <option v-for="name in optimizerPresetOptions" :key="name" :value="name">{{ name }}</option>
                </select>
              </div>
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

        <!-- Step 3: Optimisation -->
        <div v-if="currentStep === 3" class="step-content">
          <div class="step-header">
            <AppIcon icon="tabler/sliders" class="step-icon" />
            <div class="step-info">
              <h3>Step 3: Optimisation</h3>
              <p>Run optimisation to generate filters based on your measurement and target.</p>
            </div>
          </div>

          <div class="optimisation">
            <button class="nav-button primary" :disabled="optimising || !canOptimise" @click="runOptimisation">
              {{ optimising ? 'Optimising…' : 'Run optimisation' }}
            </button>
            <div class="opt-status" v-if="optStatus">{{ optStatus }}</div>
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
const targetNames = computed(() => Object.keys(targets.value))
const targetDescriptions = ref<Record<string, string>>({})

const emit = defineEmits<{ close: []; equalisationSetup: [{
  targetCurve: TargetCurveName
  targetCurvePoints: RoomEQTargetPoint[]
  range: { min: number; max: number }
  limits: { maxBoost: number; maxCut: number }
}] }>()

const measurement = computed(() => props.measurement)

// Steps
const currentStep = ref(1)
const totalSteps = 3

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
    if (resp.success && resp.data) {
      const data: unknown = resp.data
      let dict: Record<string, RoomEQTargetPoint[]> = {}
      const descs: Record<string, string> = {}
      if (data && typeof data === 'object') {
        const maybe = data as Record<string, unknown>
        // Case 1: { target_curves: [{ name, curve, description? }, ...] }
        if (Array.isArray(maybe.target_curves)) {
          const arr = maybe.target_curves as Array<Record<string, unknown>>
          const out: Record<string, RoomEQTargetPoint[]> = {}
          for (const item of arr) {
            const name = (item.name as string) || ''
            const curve = item.curve as RoomEQTargetPoint[] | undefined
            if (name && Array.isArray(curve)) {
              out[name] = curve
              const d = (item.description as string) || ''
              if (d) descs[name] = d
            }
          }
          dict = out
        }
        // Case 2: { targets: { name: points[] } }
        else if (maybe.targets && typeof maybe.targets === 'object') {
          dict = maybe.targets as Record<string, RoomEQTargetPoint[]>
        }
        // Case 3: { presets: { targets: { name: points[] } } }
        else if (maybe.presets && typeof maybe.presets === 'object') {
          const presets = maybe.presets as Record<string, unknown>
          if (presets.targets && typeof presets.targets === 'object') {
            dict = presets.targets as Record<string, RoomEQTargetPoint[]>
          }
        }
        // Case 4: Already a plain dict
        else {
          dict = data as Record<string, RoomEQTargetPoint[]>
        }
      }
      targets.value = dict
      targetDescriptions.value = descs
      // Prefer 'flat' if available, otherwise first key
      if (!targetCurve.value) {
        targetCurve.value = (dict && 'flat' in dict) ? 'flat' : (Object.keys(dict)[0] ?? '')
      }
    } else {
      console.error('Failed to load EQ targets:', resp.detail)
      targets.value = {}
      targetDescriptions.value = {}
    }
  } catch (e) {
    console.error('Error loading EQ targets:', e)
    targets.value = {}
    targetDescriptions.value = {}
  } finally {
    loadingTargets.value = false
  }
}

const toLabel = (name: string) => name.replace(/_/g, ' ')
const selectTarget = (name: string) => { targetCurve.value = name }

const selectedTargetPoints = computed(() => targets.value[targetCurve.value] || [])

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
  if (!pts.length) return ''
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
    const [f, mag] = p as [number, number]
    if (f >= minFreq && f <= maxFreq) {
      const x = logScale(f)
      const y = magScale(mag)
      path = path === '' ? `M ${x} ${y}` : `${path} L ${x} ${y}`
    }
  }
  return path
}

// Optimisation step
import { runRoomEQOptimization, type RoomEQOptimizationRequest, getRoomEQOptimizerPresets } from '@/api/roomeq'
const optimising = ref(false)
const optStatus = ref('')
const canOptimise = computed(() => !!measurement.value && selectedTargetPoints.value.length > 0)
const optimizerPreset = ref('Default')
const optimizerPresetOptions = ref<string[]>(['Default'])
const loadOptimizerPresets = async () => {
  try {
    if (!exportMode.value) {
      optimizerPresetOptions.value = ['Default']
      optimizerPreset.value = 'Default'
      return
    }
    const resp = await getRoomEQOptimizerPresets()
    if (resp.success && resp.data && Array.isArray(resp.data)) {
      optimizerPresetOptions.value = exportMode.value ? resp.data : ['Default']
      if (!optimizerPresetOptions.value.includes(optimizerPreset.value)) {
        optimizerPreset.value = optimizerPresetOptions.value[0] || 'Default'
      }
    }
  } catch {
    optimizerPresetOptions.value = ['Default']
    optimizerPreset.value = 'Default'
  }
}
const runOptimisation = async () => {
  if (!measurement.value) return
  optimising.value = true
  optStatus.value = 'Starting optimisation…'
  try {
    const payload: RoomEQOptimizationRequest = {
      measurement: {
        frequencies: measurement.value.frequencies,
        magnitudes: measurement.value.magnitudes,
        sample_rate: measurement.value.sample_rate,
      },
      target_curve: selectedTargetPoints.value,
      range: exportMode.value ? { min: rangeMin.value, max: rangeMax.value } : undefined,
      limits: exportMode.value ? { maxBoost: maxBoost.value, maxCut: maxCut.value } : undefined,
  optimizer_preset: optimizerPreset.value,
    }
    const resp = await runRoomEQOptimization(payload)
    if (resp.success) {
      optStatus.value = 'Optimisation completed.'
    } else {
      optStatus.value = `Optimisation failed: ${resp.detail ?? 'unknown error'}`
    }
  } catch (e) {
    optStatus.value = `Optimisation error: ${(e as Error).message}`
  } finally {
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
</style>
