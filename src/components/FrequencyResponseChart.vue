<template>
  <div class="frequency-response-chart">
    <svg :viewBox="viewBox" class="response-svg">
      <!-- Grid pattern -->
      <defs>
        <pattern :id="gridPatternId" width="40" height="30" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#444" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect :width="svgWidth" :height="svgHeight" :fill="`url(#${gridPatternId})`" />

      <!-- 0 dB reference line -->
      <line
        v-if="showReferenceLine"
        :x1="resolvedConfig.offsetX"
        :y1="zeroDbY"
        :x2="resolvedConfig.offsetX + resolvedConfig.chartWidth"
        :y2="zeroDbY"
        stroke="#666"
        stroke-width="1"
        :stroke-dasharray="referenceDashArray"
      />

      <!-- Frequency axis labels -->
      <g class="frequency-axis">
        <text
          v-for="label in resolvedFrequencyLabels"
          :key="`f-${label.label}`"
          :x="label.x"
          y="290"
          text-anchor="middle"
          class="axis-label"
        >{{ label.label }}</text>
      </g>

      <!-- Magnitude axis labels -->
      <g class="magnitude-axis">
        <text
          v-for="label in resolvedMagnitudeLabels"
          :key="`m-${label.label}`"
          x="20"
          :y="label.y"
          text-anchor="middle"
          class="axis-label"
        >{{ label.label }}</text>
      </g>

      <!-- Curves -->
      <path
        v-for="(curve, index) in renderedCurves"
        :key="index"
        :d="curve.path"
        fill="none"
        :stroke="curve.color"
        :stroke-width="curve.strokeWidth"
        :opacity="curve.opacity"
        :stroke-dasharray="curve.dashArray || 'none'"
      />

      <!-- Slot for additional SVG elements (e.g., frequency range indicators) -->
      <slot />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  type ChartConfig,
  CHART_CONFIGS,
  generateFrequencyPath,
  generateTargetCurvePath,
  frequencyToX,
  magnitudeToY,
} from '@/composables/useChartPaths'

interface CurveDefinition {
  frequencies: number[]
  magnitudes: number[]
  color: string
  strokeWidth?: number
  opacity?: number
  dashArray?: string
  /** If true, treat data as target curve points ({frequency, target_db}) */
  isTargetCurve?: boolean
  /** Clip target curve to this min frequency */
  clipMinFreq?: number
  /** Clip target curve to this max frequency */
  clipMaxFreq?: number
}

interface FrequencyLabel {
  x: number
  label: string
}

interface MagnitudeLabel {
  y: number
  label: string
}

interface Props {
  viewBox?: string
  gridPatternId: string
  frequencyLabels?: FrequencyLabel[]
  magnitudeLabels?: MagnitudeLabel[]
  curves?: CurveDefinition[]
  showReferenceLine?: boolean
  referenceDashArray?: string
  chartConfig?: ChartConfig
}

const props = withDefaults(defineProps<Props>(), {
  viewBox: '0 0 800 300',
  showReferenceLine: true,
  referenceDashArray: '5,5',
})

const resolvedConfig = computed<ChartConfig>(() => props.chartConfig ?? CHART_CONFIGS.standard)

const svgWidth = computed(() => {
  const parts = props.viewBox.split(' ')
  return parseInt(parts[2]) || 800
})

const svgHeight = computed(() => {
  const parts = props.viewBox.split(' ')
  return parseInt(parts[3]) || 300
})

const zeroDbY = computed(() => magnitudeToY(0, resolvedConfig.value))

// Default frequency axis labels mapped to X positions via the chart config
const defaultFrequencyLabels = computed<FrequencyLabel[]>(() => {
  const cfg = resolvedConfig.value
  const labels: { freq: number; text: string }[] = [
    { freq: 20, text: '20' },
    { freq: 100, text: '100' },
    { freq: 1000, text: '1k' },
    { freq: 10000, text: '10k' },
  ]
  // Add 20k or 25k depending on maxFreq
  if (cfg.maxFreq >= 25000) {
    labels.push({ freq: 25000, text: '25k' })
  } else {
    labels.push({ freq: 20000, text: '20k' })
  }
  return labels.map(l => ({
    x: frequencyToX(l.freq, cfg),
    label: l.text,
  }))
})

// Default magnitude axis labels
const defaultMagnitudeLabels = computed<MagnitudeLabel[]>(() => {
  const cfg = resolvedConfig.value
  const labels: { mag: number; text: string }[] = []

  if (cfg.minMag === -30 && cfg.maxMag === 30) {
    labels.push({ mag: -20, text: '-20' }, { mag: 0, text: '0' }, { mag: 20, text: '+20' })
  } else if (cfg.minMag === -20 && cfg.maxMag === 20) {
    labels.push(
      { mag: -20, text: '-20' }, { mag: -10, text: '-10' }, { mag: -5, text: '-5' },
      { mag: 0, text: '0' }, { mag: 5, text: '+5' }, { mag: 10, text: '+10' },
      { mag: 20, text: '+20' },
    )
  } else if (cfg.minMag === -10 && cfg.maxMag === 10) {
    labels.push(
      { mag: -10, text: '-10' }, { mag: -5, text: '-5' },
      { mag: 0, text: '0' }, { mag: 5, text: '+5' }, { mag: 10, text: '+10' },
    )
  } else {
    // Fallback: just show min, 0, max
    labels.push(
      { mag: cfg.minMag, text: String(cfg.minMag) },
      { mag: 0, text: '0' },
      { mag: cfg.maxMag, text: `+${cfg.maxMag}` },
    )
  }
  return labels.map(l => ({ y: magnitudeToY(l.mag, cfg), label: l.text }))
})

const resolvedFrequencyLabels = computed(() => props.frequencyLabels ?? defaultFrequencyLabels.value)
const resolvedMagnitudeLabels = computed(() => props.magnitudeLabels ?? defaultMagnitudeLabels.value)

// Pre-render all curve paths
const renderedCurves = computed(() => {
  if (!props.curves) return []
  const cfg = resolvedConfig.value
  return props.curves.map(curve => {
    let path: string
    if (curve.isTargetCurve) {
      // Convert frequencies/magnitudes arrays to target point format
      const targetPoints = curve.frequencies.map((f, i) => ({
        frequency: f,
        target_db: curve.magnitudes[i],
      }))
      path = generateTargetCurvePath(targetPoints, cfg, curve.clipMinFreq, curve.clipMaxFreq)
    } else {
      path = generateFrequencyPath(curve.frequencies, curve.magnitudes, cfg)
    }
    return {
      path,
      color: curve.color,
      strokeWidth: curve.strokeWidth ?? 2,
      opacity: curve.opacity ?? 1,
      dashArray: curve.dashArray,
    }
  })
})
</script>

<style scoped lang="scss">
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
</style>
