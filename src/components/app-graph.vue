<template>
  <svg :width="width" :height="height" class="bg-white border">
    <!-- Grid Lines -->
    <g>
      <line v-for="y in yTicks" :key="y" :x1="0" :x2="width" :y1="yScale(y)" :y2="yScale(y)" stroke="#eee" />
    </g>

    <!-- Filled Area -->
    <path :d="areaPath" fill="rgba(255,0,0,0.2)" />

    <!-- EQ Curve -->
    <path :d="linePath" stroke="red" fill="none" stroke-width="2" />

    <!-- Draggable Points -->
    <circle v-for="(point, i) in points" :key="i" :cx="xScale(point.freq)" :cy="yScale(point.gain)" r="6" fill="red"
      cursor="pointer" @mousedown="dragStart($event, i)" />
  </svg>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import * as d3 from 'd3';
import { DEFAULT_FREQ_RANGE, DEFAULT_GAIN_RANGE } from '@/utils/filtergraph';

interface Point {
  freq: number;
  gain: number;
}

const width = 800;
const height = 300;

// Points state
const points = ref<Point[]>([
  { freq: 60, gain: 10 },
  { freq: 1000, gain: -5 },
  { freq: 8000, gain: 0 },
]);

const xScale = d3.scaleLog().domain([DEFAULT_FREQ_RANGE.min, DEFAULT_FREQ_RANGE.max]).range([50, width - 50]);
const yScale = d3.scaleLinear().domain([DEFAULT_GAIN_RANGE.min, DEFAULT_GAIN_RANGE.max]).range([height - 30, 30]);

const yTicks = d3.range(DEFAULT_GAIN_RANGE.min, DEFAULT_GAIN_RANGE.max + 5, 5);

const linePath = computed(() => {
  const path = d3.line<Point>()
    .x(d => xScale(d.freq))
    .y(d => yScale(d.gain))
    .curve(d3.curveMonotoneX)(points.value);
  return path || '';
});

const areaPath = computed(() => {
  const path = d3.area<Point>()
    .x(d => xScale(d.freq))
    .y0(yScale(0))
    .y1(d => yScale(d.gain))
    .curve(d3.curveMonotoneX)(points.value);
  return path || '';
});

let draggingPoint: number | null = null;

function dragStart(event: MouseEvent, index: number) {
  draggingPoint = index;
  window.addEventListener('mousemove', dragMove);
  window.addEventListener('mouseup', dragEnd);
}

function dragMove(event: MouseEvent) {
  if (draggingPoint === null) return;

  const svg = document.querySelector('svg');
  if (!svg) return;

  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const screenCTM = svg.getScreenCTM();
  if (!screenCTM) return;

  const cursorpt = pt.matrixTransform(screenCTM.inverse());

  const newFreq = Math.min(Math.max(xScale.invert(cursorpt.x), DEFAULT_FREQ_RANGE.min), DEFAULT_FREQ_RANGE.max);
  const newGain = Math.min(Math.max(yScale.invert(cursorpt.y), DEFAULT_GAIN_RANGE.min), DEFAULT_GAIN_RANGE.max);

  points.value[draggingPoint] = { freq: newFreq, gain: newGain };
}

function dragEnd() {
  draggingPoint = null;
  window.removeEventListener('mousemove', dragMove);
  window.removeEventListener('mouseup', dragEnd);
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', dragMove);
  window.removeEventListener('mouseup', dragEnd);
});
</script>

<style scoped>
svg {
  user-select: none;
}
</style>
