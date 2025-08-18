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
                    <text x="750" y="290" text-anchor="middle" class="axis-label">20k</text>
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
              <div class="segmented">
                <button type="button" class="segmented-btn" :class="{ active: targetCurve === 'flat' }" @click="targetCurve = 'flat'">Flat</button>
                <button type="button" class="segmented-btn" :class="{ active: targetCurve === 'tilt' }" @click="targetCurve = 'tilt'">Tilt</button>
              </div>
            </div>

            <div class="option-row" v-if="targetCurve === 'tilt'">
              <label class="option-label">Tilt amount</label>
              <div class="control-inline">
                <input type="number" v-model.number="tiltDbPerDecade" min="-10" max="10" step="0.5" class="number-input" />
                <span class="suffix">dB / decade</span>
              </div>
            </div>

            <div class="option-row">
              <label class="option-label">Correction range</label>
              <div class="control-inline">
                <input type="number" v-model.number="rangeMin" min="10" max="20000" step="1" class="number-input" />
                <span class="suffix">Hz</span>
                <span class="sep">–</span>
                <input type="number" v-model.number="rangeMax" min="20" max="24000" step="1" class="number-input" />
                <span class="suffix">Hz</span>
              </div>
            </div>

            <div class="option-row">
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

            <div class="option-row">
              <label class="option-label">Smoothing</label>
              <select v-model="smoothing" class="select-input">
                <option value="none">None</option>
                <option value="1/3_octave">1/3 Octave</option>
                <option value="1/6_octave">1/6 Octave</option>
                <option value="psychoacoustic">Psychoacoustic</option>
              </select>
            </div>
          </div>
        </div>
+      </div>

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
import { ref, computed, watch } from 'vue'
import AppIcon from './app-icon.vue'
import type { RoomMeasurement } from '@/stores/settings'

interface Props {
  isOpen: boolean
  measurement: RoomMeasurement | null
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: []; equalisationSetup: [{
  targetCurve: 'flat' | 'tilt'
  tiltDbPerDecade: number
  range: { min: number; max: number }
  limits: { maxBoost: number; maxCut: number }
  smoothing: 'none' | '1/3_octave' | '1/6_octave' | 'psychoacoustic'
}] }>()

const measurement = computed(() => props.measurement)

// Steps
const currentStep = ref(1)
const totalSteps = 2

// EQ option state
const targetCurve = ref<'flat' | 'tilt'>('flat')
const tiltDbPerDecade = ref<number>(-1.5)
const smoothing = ref<'none' | '1/3_octave' | '1/6_octave' | 'psychoacoustic'>('1/3_octave')
const rangeMin = ref<number>(20)
const rangeMax = ref<number>(20000)
const maxBoost = ref<number>(6)
const maxCut = ref<number>(12)

watch(measurement, (m) => {
  if (m?.frequency_range) {
    rangeMin.value = Math.max(10, Math.floor(m.frequency_range[0]))
    rangeMax.value = Math.min(24000, Math.ceil(m.frequency_range[1]))
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
  targetCurve.value = 'flat'
  tiltDbPerDecade.value = -1.5
  smoothing.value = '1/3_octave'
  rangeMin.value = 20
  rangeMax.value = 20000
  maxBoost.value = 6
  maxCut.value = 12
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
    tiltDbPerDecade: tiltDbPerDecade.value,
    range: { min: rangeMin.value, max: rangeMax.value },
    limits: { maxBoost: maxBoost.value, maxCut: maxCut.value },
    smoothing: smoothing.value
  })
  closeWizard()
}

// Chart path generator based on saved measurement
const generatePath = (m: RoomMeasurement): string => {
  if (!m.frequencies || !m.magnitudes) return ''

  const minFreq = 20
  const maxFreq = 20000
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

.modal-footer { padding: 16px 24px 24px 24px; border-top: 1px solid var(--color-border); }
.step-navigation { display: flex; align-items: center; justify-content: space-between; }
</style>
