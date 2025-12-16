<template>
  <div class="graph" ref="graphContainer" @mousemove="handleMouseMove" @mouseup="handleMouseUp"
       @mouseleave="handleMouseUp" @dragstart.prevent>
    <svg ref="svgElement" :width="svgWidth" :height="svgHeight" @dragstart.prevent>
      <defs>
        <clipPath id="plotClipPath">
          <rect :x="0" :y="0" :width="plotWidth" :height="plotHeight" />
        </clipPath>
      </defs>
      <g :transform="`translate(${margin.left},${margin.top})`">
        <g stroke="#444" stroke-width="0.5">
          <line v-for="y in gainGridLines" :key="'gain-grid-' + y" :y1="gainToYLocal(y)" :y2="gainToYLocal(y)" :x1="0"
                :x2="plotWidth" />
          <line v-for="f in freqGridLines" :key="'freq-grid-' + f" :x1="frequencyToXLocal(f)" :x2="frequencyToXLocal(f)"
                :y1="0" :y2="plotHeight" />
        </g>

        <g clip-path="url(#plotClipPath)">
          <path v-if="combinedGraphData" :d="combinedGraphData.linePath" stroke="#e11e4a" fill="none" stroke-width="2.5" />
          <line v-else :x1="0" :y1="gainToYLocal(0)" :x2="plotWidth" :y2="gainToYLocal(0)" stroke="#999" stroke-width="1" stroke-dasharray="2 2" />

          <template v-if="activeFilterGraphData">
            <path :d="activeFilterGraphData.areaPath" fill="rgba(0, 184, 255, 0.1)" stroke="none" />
            <path :d="activeFilterGraphData.linePath" stroke="#00b8ff" fill="none" stroke-width="2" />
          </template>

          <template v-if="showBandwidthLines && activeFilterBandwidthStart !== null && activeFilterBandwidthEnd !== null">
            <rect :x="frequencyToXLocal(activeFilterBandwidthStart)" :y="0"
              :width="frequencyToXLocal(activeFilterBandwidthEnd) - frequencyToXLocal(activeFilterBandwidthStart)"
              :height="plotHeight" fill="rgba(0, 184, 255, 0.03)" stroke="none" />
            <line :x1="frequencyToXLocal(activeFilterBandwidthStart)" :x2="frequencyToXLocal(activeFilterBandwidthStart)"
              :y1="0" :y2="plotHeight" stroke="#00b8ff" stroke-width="1" stroke-dasharray="4 2" />
            <line :x1="frequencyToXLocal(activeFilterBandwidthEnd)" :x2="frequencyToXLocal(activeFilterBandwidthEnd)" :y1="0"
              :y2="plotHeight" stroke="#00b8ff" stroke-width="1" stroke-dasharray="4 2" />

            <line :x1="frequencyToXLocal(activeFilterBandwidthStart)" :x2="frequencyToXLocal(activeFilterBandwidthStart)"
              :y1="0" :y2="plotHeight" stroke="transparent" stroke-width="16"
              @mousedown.prevent="startBandwidthDrag($event, 'start')" @dragstart.prevent style="cursor: ew-resize;" />
            <line :x1="frequencyToXLocal(activeFilterBandwidthEnd)" :x2="frequencyToXLocal(activeFilterBandwidthEnd)" :y1="0"
              :y2="plotHeight" stroke="transparent" stroke-width="16"
              @mousedown.prevent="startBandwidthDrag($event, 'end')" @dragstart.prevent style="cursor: ew-resize;" />
          </template>
        </g>

        <!-- Filter nodes -->
        <circle v-for="band in nonGenericFilters" :key="'node-' + band.id"
                :cx="frequencyToXLocal(band.frequency)" :cy="gainToYLocal(band.gain)" r="6"
                :fill="band.id === activeFilterId ? '#00b8ff' : '#999'" />
        <circle
          v-for="band in nonGenericFilters"
          :key="'hit-area-' + band.id"
          :cx="frequencyToXLocal(band.frequency)"
          :cy="gainToYLocal(band.gain)"
          r="12"
          fill="none"
          stroke="none"
          pointer-events="all"
          @mousedown.prevent="startDrag($event, band)"
          @dragstart.prevent
          style="cursor: grab;"
        />
      </g>

      <g class="x-axis-labels" :transform="`translate(${margin.left}, ${svgHeight - margin.bottom + 20})`">
        <text v-for="f in freqGridLabels" :key="'x-label-' + f" :x="frequencyToXLocal(f)" y="0" text-anchor="middle"
              fill="#aaa" font-size="10">
          {{ formatHzForSVG(f) }}
        </text>
      </g>

      <g class="y-axis-labels" :transform="`translate(${margin.left - 5}, ${margin.top})`">
        <text v-for="g in gainGridLabels" :key="'y-label-' + g" x="0" :y="gainToYLocal(g)" text-anchor="end"
              dominant-baseline="middle" fill="#aaa" font-size="10">
          {{ g }} dB
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Filter } from '@/utils/filtercalc'
import { calculateFilterGain } from '@/utils/filtercalc'
import { useBandwidthLines } from '@/composables/useBandwidthLines'
import { bandwidthToQ } from '@/utils/biquad'
import {
  DEFAULT_FREQ_RANGE,
  DEFAULT_GAIN_RANGE,
  frequencyToX,
  xToFrequency,
  gainToY,
  yToGain,
  generateFrequencyGridLines,
  generateFrequencyLabels,
  generateGainGridLines,
} from '@/utils/filtergraph'

const props = defineProps<{
  filters: Filter[]
  activeFilterId: number | null
  showBandwidthLines?: boolean
  sampleRate?: number
}>()

const emit = defineEmits<{
  (e: 'set-active-filter', id: number): void
  (e: 'update:freq-gain', payload: { id: number, frequency: number, gain: number }): void
  (e: 'update:q', payload: { id: number, Q: number }): void
  (e: 'drag-start', id: number): void
  (e: 'drag-end', id: number): void
}>()

const SHOW_BW = computed(() => props.showBandwidthLines ?? true)
const SAMPLE_RATE = computed(() => props.sampleRate ?? 48000)

const isDragging = ref(false)
const isDraggingBandwidth = ref(false)
const bandwidthDragSide = ref<'start' | 'end' | null>(null)

const svgElement = ref<SVGSVGElement | null>(null)
const graphContainer = ref<HTMLDivElement | null>(null)
const svgWidth = ref(900)
const svgHeight = ref(500)
const margin = { top: 10, right: 30, bottom: 30, left: 50 }
const plotWidth = computed(() => svgWidth.value - margin.left - margin.right)
const plotHeight = computed(() => svgHeight.value - margin.top - margin.bottom)

const gainGridLines = generateGainGridLines()
const gainGridLabels = generateGainGridLines()
const freqGridLines = computed(() => generateFrequencyGridLines())
const freqGridLabels = computed(() => generateFrequencyLabels())

const frequencyToXLocal = (freq: number) => frequencyToX(freq, plotWidth.value)
const xToFrequencyLocal = (x: number) => xToFrequency(x, plotWidth.value)
const gainToYLocal = (gain: number) => gainToY(gain, plotHeight.value)
const yToGainLocal = (y: number) => yToGain(y, plotHeight.value)

const currentFilter = computed<Filter>(() => {
  return (
    props.filters.find(f => f.id === props.activeFilterId) || {
      id: 0, icon: 'peaking', text: '', frequency: 1000, gain: 0, Q: 1.0, enabled: true
    }
  ) as Filter
})

const { activeFilterBandwidthStart, activeFilterBandwidthEnd } = useBandwidthLines(currentFilter, SAMPLE_RATE.value)

const activeFilterGraphData = computed(() => {
  if (!props.activeFilterId) return null
  const band = props.filters.find(f => f.id === props.activeFilterId)
  if (!band || !band.enabled) return null

  const linePoints: string[] = []
  const areaPoints: string[] = []
  const baselineY = gainToYLocal(0)

  areaPoints.push(`${frequencyToXLocal(DEFAULT_FREQ_RANGE.min)},${baselineY}`)
  const minFreq = DEFAULT_FREQ_RANGE.min
  const maxFreq = DEFAULT_FREQ_RANGE.max
  const numPoints = 200
  for (let i = 0; i <= numPoints; i++) {
    const logFreq = Math.log10(minFreq) + (i / numPoints) * (Math.log10(maxFreq) - Math.log10(minFreq))
    const freq = Math.pow(10, logFreq)
    const x = frequencyToXLocal(freq)
    const gainVal = calculateFilterGain(freq, band, SAMPLE_RATE.value)
    const y = gainToYLocal(gainVal)
    linePoints.push(`${x},${y}`)
    areaPoints.push(`${x},${y}`)
  }
  areaPoints.push(`${frequencyToXLocal(DEFAULT_FREQ_RANGE.max)},${baselineY}`)
  areaPoints.push(`${frequencyToXLocal(DEFAULT_FREQ_RANGE.min)},${baselineY}`)
  return {
    linePath: `M ${linePoints.join(' L ')}`,
    areaPath: `M ${areaPoints.join(' L ')}`,
  }
})

const combinedGraphData = computed(() => {
  if (props.filters.length === 0) return null
  const linePoints: string[] = []
  const minFreq = DEFAULT_FREQ_RANGE.min
  const maxFreq = DEFAULT_FREQ_RANGE.max
  const numPoints = 200
  for (let i = 0; i <= numPoints; i++) {
    const logFreq = Math.log10(minFreq) + (i / numPoints) * (Math.log10(maxFreq) - Math.log10(minFreq))
    const freq = Math.pow(10, logFreq)
    let totalGain = 0
    props.filters.forEach(band => { if (band.enabled) totalGain += calculateFilterGain(freq, band, SAMPLE_RATE.value) })
    const x = frequencyToXLocal(freq)
    const y = gainToYLocal(totalGain)
    linePoints.push(`${x},${y}`)
  }
  return { linePath: `M ${linePoints.join(' L ')}` }
})

const nonGenericFilters = computed(() => props.filters.filter(f => f.icon !== 'generic_normalized'))

const startDrag = (e: MouseEvent, band: Filter) => {
  e.preventDefault(); e.stopPropagation()
  emit('set-active-filter', band.id)
  emit('drag-start', band.id)
  isDragging.value = true
  if (svgElement.value) svgElement.value.style.cursor = 'grabbing'
  document.addEventListener('mousemove', handleGlobalMouseMove)
  document.addEventListener('mouseup', handleGlobalMouseUp)
  document.body.style.userSelect = 'none'
}

const startBandwidthDrag = (e: MouseEvent, side: 'start' | 'end') => {
  e.preventDefault(); e.stopPropagation()
  if (!props.activeFilterId) return
  isDraggingBandwidth.value = true
  bandwidthDragSide.value = side
  if (svgElement.value) svgElement.value.style.cursor = 'ew-resize'
  document.addEventListener('mousemove', handleGlobalMouseMove)
  document.addEventListener('mouseup', handleGlobalMouseUp)
  document.body.style.userSelect = 'none'
}

const handleMouseMove = (e: MouseEvent) => {
  if (!svgElement.value) return
  const rect = svgElement.value.getBoundingClientRect()
  const xInPlot = e.clientX - rect.left - margin.left
  const yInPlot = e.clientY - rect.top - margin.top

  if (isDraggingBandwidth.value && props.activeFilterId && bandwidthDragSide.value) {
    const clampedX = Math.max(0, Math.min(plotWidth.value, xInPlot))
    const newFreq = xToFrequencyLocal(clampedX)
    const filter = props.filters.find(f => f.id === props.activeFilterId)
    if (!filter) return
    const centerFreq = filter.frequency
    let newBandwidthOctaves: number
    if (bandwidthDragSide.value === 'start') {
      const upperFreq = activeFilterBandwidthEnd.value || centerFreq * Math.sqrt(2)
      newBandwidthOctaves = Math.log2(upperFreq / Math.max(newFreq, 1))
    } else {
      const lowerFreq = activeFilterBandwidthStart.value || centerFreq / Math.sqrt(2)
      newBandwidthOctaves = Math.log2(Math.max(newFreq, 1) / lowerFreq)
    }
    newBandwidthOctaves = Math.max(0.1, Math.min(10, newBandwidthOctaves))
    const omega0 = (2 * Math.PI * centerFreq) / SAMPLE_RATE.value
    const newQ = Math.max(0.1, Math.min(25.0, bandwidthToQ(newBandwidthOctaves, omega0)))
    emit('update:q', { id: filter.id, Q: newQ })
  } else if (isDragging.value && props.activeFilterId) {
    const clampedX = Math.max(0, Math.min(plotWidth.value, xInPlot))
    const clampedY = Math.max(0, Math.min(plotHeight.value, yInPlot))
    const newFreq = Math.round(xToFrequencyLocal(clampedX) / 10) * 10
    const newGain = Math.max(DEFAULT_GAIN_RANGE.min, Math.min(DEFAULT_GAIN_RANGE.max, Math.round(yToGainLocal(clampedY))))
    emit('update:freq-gain', { id: props.activeFilterId, frequency: newFreq, gain: newGain })
  } else {
    updateCursor(xInPlot, yInPlot)
  }
}

const handleMouseUp = () => {
  if (isDragging.value && props.activeFilterId) {
    emit('drag-end', props.activeFilterId)
  }
  if (isDraggingBandwidth.value && props.activeFilterId) {
    emit('drag-end', props.activeFilterId)
  }
  isDragging.value = false
  isDraggingBandwidth.value = false
  bandwidthDragSide.value = null
  if (svgElement.value) svgElement.value.style.cursor = 'default'
}

const handleGlobalMouseMove = (e: MouseEvent) => {
  if (!isDragging.value && !isDraggingBandwidth.value) return
  handleMouseMove(e)
}
const handleGlobalMouseUp = () => {
  if (isDragging.value || isDraggingBandwidth.value) {
    handleMouseUp()
    document.removeEventListener('mousemove', handleGlobalMouseMove)
    document.removeEventListener('mouseup', handleGlobalMouseUp)
    document.body.style.userSelect = ''
  }
}

const updateSvgDimensions = () => {
  if (graphContainer.value) {
    svgWidth.value = graphContainer.value.offsetWidth
    svgHeight.value = 500
  }
}

const updateCursor = (xInPlot: number, yInPlot: number) => {
  if (!svgElement.value) return
  const BANDWIDTH_LINE_TOLERANCE = 16
  const FILTER_NODE_TOLERANCE = 12
  let newCursor = 'default'
  for (const f of props.filters) {
    const fx = frequencyToXLocal(f.frequency)
    const fy = gainToYLocal(f.gain)
    const dist = Math.sqrt(Math.pow(xInPlot - fx, 2) + Math.pow(yInPlot - fy, 2))
    if (dist <= FILTER_NODE_TOLERANCE) { newCursor = 'grab'; break }
  }
  if (
    newCursor === 'default' && SHOW_BW.value &&
    activeFilterBandwidthStart.value !== null && activeFilterBandwidthEnd.value !== null
  ) {
    const startX = frequencyToXLocal(activeFilterBandwidthStart.value)
    const endX = frequencyToXLocal(activeFilterBandwidthEnd.value)
    if (Math.abs(xInPlot - startX) <= BANDWIDTH_LINE_TOLERANCE) newCursor = 'ew-resize'
    else if (Math.abs(xInPlot - endX) <= BANDWIDTH_LINE_TOLERANCE) newCursor = 'ew-resize'
  }
  svgElement.value.style.cursor = newCursor
}

const formatHzForSVG = (val: number) => (val >= 1000 ? `${val / 1000} kHz` : `${val} Hz`)

onMounted(() => {
  updateSvgDimensions()
  window.addEventListener('resize', updateSvgDimensions)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateSvgDimensions)
  document.removeEventListener('mousemove', handleGlobalMouseMove)
  document.removeEventListener('mouseup', handleGlobalMouseUp)
  if (svgElement.value) svgElement.value.style.cursor = 'default'
})
</script>

<style scoped>
.graph { position: relative; border-radius: 8px; width: 100%; user-select: none; }
.graph svg { width: 100%; overflow: visible; user-select: none; }
.x-axis-labels, .y-axis-labels { font-family: 'Metropolis', sans-serif; font-weight: 400; font-size: 10px; }
</style>
