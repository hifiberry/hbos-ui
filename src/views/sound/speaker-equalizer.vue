<template>
  <div class="sound-page">
    <div class="sound">
      <div class="page-header">
        <h1>Speaker Equaliser {{ channelMode === 'both' ? 'Both' : (activeChannel === 'left' ? 'Left' : 'Right') }}</h1>
        <div class="header-actions">
          <AppIcon :icon="channelMode === 'both' ? 'link' : 'link-unlinked'" @click="toggleChannelMode" />
          <AppIcon
            icon="ear"
            @mousedown="startBypass"
            @mouseup="endBypass"
            @mouseleave="endBypass"
            @touchstart="startBypass"
            @touchend="endBypass"
            :class="{ bypassed: isBypassed }"
          />
        </div>
      </div>
      <div class="card">
        <div class="graph" ref="graphContainer" @mousemove="handleMouseMove" @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp">
          <svg ref="svgElement" :width="svgWidth" :height="svgHeight">
            <defs>
              <clipPath id="plotClipPath">
                <rect :x="0" :y="0" :width="plotWidth" :height="plotHeight" />
              </clipPath>
            </defs>
            <g :transform="`translate(${margin.left},${margin.top})`">
              <g stroke="#444" stroke-dasharray="4">
                <line v-for="y in gainGridLines" :key="'gain-grid-' + y" :y1="gainToYLocal(y)" :y2="gainToYLocal(y)" :x1="0"
                  :x2="plotWidth" />
                <line v-for="f in freqGridLines" :key="'freq-grid-' + f" :x1="frequencyToXLocal(f)" :x2="frequencyToXLocal(f)"
                  :y1="0" :y2="plotHeight" />
              </g>

              <g clip-path="url(#plotClipPath)">
                <template v-if="activeFilterBandwidthStart !== null && activeFilterBandwidthEnd !== null">
                  <line :x1="frequencyToXLocal(activeFilterBandwidthStart)" :x2="frequencyToXLocal(activeFilterBandwidthStart)"
                    :y1="0" :y2="plotHeight" stroke="#e11e4a" stroke-width="1.5" stroke-dasharray="8 4" />
                  <line :x1="frequencyToXLocal(activeFilterBandwidthEnd)" :x2="frequencyToXLocal(activeFilterBandwidthEnd)" :y1="0"
                    :y2="plotHeight" stroke="#00b8ff" stroke-width="1.5" stroke-dasharray="4 2" />
                </template>

                <path v-if="allFiltersCombinedGraphData" :d="allFiltersCombinedGraphData.linePath"
                  stroke="#e11e4a" fill="none" stroke-width="2.5" />

                <template v-if="activeFilterGraphData">
                  <path :d="activeFilterGraphData.areaPath" fill="rgba(0, 184, 255, 0.1)" stroke="none" />
                  <path :d="activeFilterGraphData.linePath" stroke="#00b8ff" fill="none" stroke-width="2" />
                </template>
                <template v-else>
                  <line :x1="0" :y1="gainToYLocal(0)" :x2="plotWidth" :y2="gainToYLocal(0)" stroke="#999" stroke-width="1"
                    stroke-dasharray="2 2" />
                </template>
              </g>

              <circle v-for="band in filters" :key="'node-' + band.id" :cx="frequencyToXLocal(band.frequency)"
                :cy="gainToYLocal(band.gain)" r="6" :fill="band.id === activeFilterId ? '#00b8ff' : '#999'"
                style="cursor: grab;" @mousedown.prevent="startDrag($event, band)" />
            </g>

            <g class="x-axis-labels" :transform="`translate(${margin.left}, ${svgHeight - margin.bottom + 5})`">
              <text v-for="f in freqGridLines" :key="'x-label-' + f" :x="frequencyToXLocal(f)" y="0" text-anchor="middle"
                fill="#aaa" font-size="10">
                {{ formatHzForSVG(f) }}
              </text>
            </g>

            <g class="y-axis-labels" :transform="`translate(${margin.left - 5}, ${margin.top})`">
              <text v-for="g in gainGridLabels" :key="'y-label-' + g" x="0" :y="gainToYLocal(g)" text-anchor="end"
                dominant-baseline="middle" fill="#aaa" font-size="10">
                {{ g }}
              </text>
            </g>
          </svg>
        </div>
      </div>

      <div class="card mt-3">
        <div class="equaliser-panel">
          <div class="tabs">
          <button :class="['tab', { active: channelMode === 'both' || activeChannel === 'left' }]" @click="setActiveChannel('left')">
            Left
          </button>
          <button :class="['tab', { active: channelMode === 'both' || activeChannel === 'right' }]" @click="setActiveChannel('right')">
            Right
          </button>
        </div>

        <div class="filters">
          <div class="filter-header-wrapper">
          </div>
        </div>

        <div class="filters-list">
          <div v-for="filter in filters" :key="filter.id" class="card">
            <div class="filter-item" :class="{ active: activeFilterId === filter.id }" @click="setActiveFilter(filter.id)">
              <div class="filter-main">
                <div class="filter-info">
                  <AppIcon :icon="getFilterIconName(filter.icon)" class="filter-icon"
                    :class="filter.icon === 'peaking' ? 'icon-stroke' : ''" />
                  <div class="filter-details">
                    <h3>{{ formatFilterTypeName(filter.icon) }} | {{ filter.frequency }} Hz | {{ filter.gain }} dB | Q {{ filter.Q ? filter.Q.toFixed(2) : 'N/A' }}</h3>
                  </div>
                </div>
                <div class="filter-actions" @click.stop>
                  <div class="filter-toggle">
                    <label class="toggle-switch">
                      <input type="checkbox" v-model="filter.enabled" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                  <div class="filter-remove" @click="removeFilter(filter.id)">
                    <AppIcon icon="close" />
                  </div>
                </div>
              </div>

              <div class="filter-controls" @click.stop>
                <div class="control-group">
                  <label>Frequency</label>
                  <div class="control-buttons">
                    <button @click="decrementFilterFrequency(filter)" class="control-btn">
                      <AppIcon icon="minus-small" />
                    </button>
                    <span class="control-value">{{ filter.frequency }} Hz</span>
                    <button @click="incrementFilterFrequency(filter)" class="control-btn">
                      <AppIcon icon="plus-small" />
                    </button>
                  </div>
                </div>

                <div class="control-group">
                  <label>Gain</label>
                  <div class="control-buttons">
                    <button @click="decrementFilterGain(filter)" class="control-btn">
                      <AppIcon icon="minus-small" />
                    </button>
                    <span class="control-value">{{ filter.gain }} dB</span>
                    <button @click="incrementFilterGain(filter)" class="control-btn">
                      <AppIcon icon="plus-small" />
                    </button>
                  </div>
                </div>

                <div class="control-group">
                  <label>Q (width)</label>
                  <div class="control-buttons">
                    <button @click="widenFilterBand(filter)" class="control-btn">
                      <AppIcon icon="minus-small" />
                    </button>
                    <span class="control-value">{{ filter.Q ? filter.Q.toFixed(2) : 'N/A' }}</span>
                    <button @click="narrowFilterBand(filter)" class="control-btn">
                      <AppIcon icon="plus-small" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="filter-item add-filter-item" @click="showAddFilterModal = true">
              <div class="filter-main">
                <div class="filter-info">
                  <AppIcon icon="plus" class="filter-icon" />
                  <div class="filter-details">
                    <h3>Add New Filter</h3>
                    <div class="filter-frequency">Click to add</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        </div>
      </div>
    </div>

    <teleport to="body">
      <div v-if="showAddFilterModal" class="modal-backdrop" @click.self="showAddFilterModal = false">
        <div class="modal-content">
          <h2>Add New Filter</h2>
          <p>Select filter type</p>

          <div class="filter-type-selector">
            <button v-for="type in AVAILABLE_FILTER_TYPES" :key="type"
              :class="['filter-type-option']"
              @click="addFilterOfType(type)">
              <AppIcon :icon="getFilterIconName(type)" class="filter-icon" />
              <span class="filter-name">{{ formatFilterTypeName(type) }}</span>
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import AppIcon from '@/components/app-icon.vue';
import {
  type Filter,
  calculateFilterGain
} from '@/utils/filtercalc';

import {
  type BiquadFilterType
} from '@/utils/biquad';

import {
  frequencyToX,
  xToFrequency,
  gainToY,
  yToGain,
  generateFrequencyGridLines,
  DEFAULT_FREQ_RANGE
} from '@/utils/filtergraph';

// Constants
const SAMPLE_RATE = 48000; // Default sample rate for biquad calculations
const CONFIG_STEPS_PER_OCTAVE = 10; // Number of frequency steps per octave for logarithmic scaling
const CONFIG_Q_STEP_FACTOR = 1.07; // Logarithmic step factor for Q value changes

// Available filter types for the UI
const AVAILABLE_FILTER_TYPES: BiquadFilterType[] = ['lowshelf', 'peaking', 'highshelf'];

// Helper functions for filter type display
const getFilterIconName = (type: BiquadFilterType): string => {
  switch (type) {
    case 'lowshelf': return 'filter-low-shelf';
    case 'peaking': return 'filter-peak';
    case 'highshelf': return 'filter-high-shelf';
    default: return 'filter-peak';
  }
};

const formatFilterTypeName = (type: BiquadFilterType): string => {
  switch (type) {
    case 'lowshelf': return 'Low Shelfing';
    case 'peaking': return 'Peaking EQ';
    case 'highshelf': return 'High Shelfing';
    default: return type;
  }
};

type Channel = 'left' | 'right';
type ChannelMode = 'individual' | 'both';

const activeChannel = ref<Channel>('left');
const channelMode = ref<ChannelMode>('individual');
const filters = ref<Filter[]>([
  { id: 1, icon: 'peaking', text: '1000', frequency: 1000, gain: 0, Q: 0.71, enabled: true } // Initial filter with Q=0.71
]);
const showAddFilterModal = ref(false);

// Bypass functionality state
const isBypassed = ref(false);
const previousFilterStates = ref<Map<number, boolean>>(new Map());

const activeFilterId = ref<number | null>(filters.value[0]?.id || null);

const isDragging = ref(false);
const svgElement = ref<SVGSVGElement | null>(null);
const selectedBand = ref<Filter | null>(null);

const graphContainer = ref<HTMLDivElement | null>(null);

// **MODIFICATION 1: Initial svgHeight set to a smaller fixed value**
const svgWidth = ref(900);
const svgHeight = ref(100); // Set a smaller initial height, e.g., 100px

const margin = { top: 10, right: 30, bottom: 30, left: 50 };
const plotWidth = computed(() => svgWidth.value - margin.left - margin.right);
const plotHeight = computed(() => svgHeight.value - margin.top - margin.bottom);

const gainGridLines = [-25, -15, -5, 0, 5, 15, 25];
const gainGridLabels = [-25, -15, -5, 0, 5, 15, 25];

// MODIFIED: Computed properties for dynamic bandwidth lines (now for all filter types)
const activeFilterBandwidthStart = computed(() => {
  const filter = currentFilter.value;
  // Lines should always be shown for the active filter if Q is valid and positive
  if (typeof filter.Q === 'number' && filter.Q > 0) {
    let bandwidthHz;

    // Different interpretations of Q for different filter types
    if (filter.icon === 'filter-peak') {
      bandwidthHz = filter.frequency / filter.Q; // Standard Q for peak filter
    } else {
      // For shelf filters, Q influences the slope. We'll use a scaled Fc/Q
      // as a visual approximation for the 'transition width'.
      // Adjust the multiplier (e.g., 0.5, 1.0, 2.0) to visually match your preference for shelves.
      bandwidthHz = filter.frequency / (filter.Q * 2); // Example: make shelf "width" less dramatic
    }

    // Clamp values to graph limits
    return Math.max(20, filter.frequency - (bandwidthHz / 2));
  }
  return null;
});

const activeFilterBandwidthEnd = computed(() => {
  const filter = currentFilter.value;
  if (typeof filter.Q === 'number' && filter.Q > 0) {
    let bandwidthHz;

    if (filter.icon === 'filter-peak') {
      bandwidthHz = filter.frequency / filter.Q;
    } else {
      bandwidthHz = filter.frequency / (filter.Q * 2);
    }

    // Clamp values to graph limits
    return Math.min(DEFAULT_FREQ_RANGE.max, filter.frequency + (bandwidthHz / 2));
  }
  return null;
});

// Wrapper functions to maintain compatibility with existing template code
const frequencyToXLocal = (freq: number) => frequencyToX(freq, plotWidth.value);
const xToFrequencyLocal = (x: number) => xToFrequency(x, plotWidth.value);
const gainToYLocal = (gain: number) => gainToY(gain, plotHeight.value);
const yToGainLocal = (y: number) => yToGain(y, plotHeight.value);

const currentFilter = computed(() => {
  // Ensure that if no filter is active, it defaults to something that won't cause errors
  // but also won't display bandwidth lines (unless you want default lines)
  return filters.value.find((f) => f.id === activeFilterId.value) || {
    id: 0,
    icon: 'none', // Default to 'none' or a type that won't trigger lines if you don't want them on startup
    text: '',
    frequency: 1000,
    gain: 0,
    Q: 1.0, // Default Q, ensuring it's a number
    enabled: true,
  };
});

const freqGridLines = computed(() => {
  return generateFrequencyGridLines();
});

const activeFilterGraphData = computed(() => {
  if (!activeFilterId.value) {
    return null;
  }

  const band = filters.value.find(f => f.id === activeFilterId.value);
  if (!band || !band.enabled) {
    return null;
  }

  const linePoints: string[] = [];
  const areaPoints: string[] = [];
  const baselineY = gainToYLocal(0);

  areaPoints.push(`${frequencyToXLocal(DEFAULT_FREQ_RANGE.min)},${baselineY}`);

  const minFreq = DEFAULT_FREQ_RANGE.min;
  const maxFreq = DEFAULT_FREQ_RANGE.max;
  const numPoints = 200;

  for (let i = 0; i <= numPoints; i++) {
    const logFreq = Math.log10(minFreq) + (i / numPoints) * (Math.log10(maxFreq) - Math.log10(minFreq));
    const freq = Math.pow(10, logFreq);

    const x = frequencyToXLocal(freq);
    const gainVal = calculateFilterGain(freq, band, SAMPLE_RATE);
    const y = gainToYLocal(gainVal);

    linePoints.push(`${x},${y}`);
    areaPoints.push(`${x},${y}`);
  }

  areaPoints.push(`${frequencyToXLocal(DEFAULT_FREQ_RANGE.max)},${baselineY}`);
  areaPoints.push(`${frequencyToXLocal(DEFAULT_FREQ_RANGE.min)},${baselineY}`);

  return {
    linePath: `M ${linePoints.join(' L ')}`,
    areaPath: `M ${areaPoints.join(' L ')}`
  };
});

const allFiltersCombinedGraphData = computed(() => {
  if (filters.value.length === 0) {
    return null;
  }

  const linePoints: string[] = [];
  const minFreq = DEFAULT_FREQ_RANGE.min;
  const maxFreq = DEFAULT_FREQ_RANGE.max;
  const numPoints = 200;

  for (let i = 0; i <= numPoints; i++) {
    const logFreq = Math.log10(minFreq) + (i / numPoints) * (Math.log10(maxFreq) - Math.log10(minFreq));
    const freq = Math.pow(10, logFreq);
    let totalCombinedGain_db = 0.0;

    filters.value.forEach(band => {
      if (band.enabled) {
        totalCombinedGain_db += calculateFilterGain(freq, band, SAMPLE_RATE);
      }
    });

    const x = frequencyToXLocal(freq);
    const y = gainToYLocal(totalCombinedGain_db);
    linePoints.push(`${x},${y}`);
  }

  return {
    linePath: `M ${linePoints.join(' L ')}`,
  };
});

function setActiveChannel(channel: Channel) {
  if (channelMode.value === 'both') {
    // In "both" mode, clicking a channel tab should switch back to individual mode
    channelMode.value = 'individual';
  }
  activeChannel.value = channel;
}

function toggleChannelMode() {
  channelMode.value = channelMode.value === 'individual' ? 'both' : 'individual';
}

// Bypass functionality - temporarily disable all filters while pressed
function startBypass() {
  if (isBypassed.value || isDragging.value) return; // Already bypassed or dragging

  isBypassed.value = true;

  // Store current filter states
  previousFilterStates.value.clear();
  filters.value.forEach(filter => {
    previousFilterStates.value.set(filter.id, filter.enabled);
    filter.enabled = false; // Disable all filters
  });
}

function endBypass() {
  if (!isBypassed.value) return; // Not bypassed

  isBypassed.value = false;

  // Restore previous filter states
  filters.value.forEach(filter => {
    const previousState = previousFilterStates.value.get(filter.id);
    if (previousState !== undefined) {
      filter.enabled = previousState;
    }
  });

  previousFilterStates.value.clear();
}

function setActiveFilter(id: number) {
  activeFilterId.value = id;
}

const addFilterOfType = (type: BiquadFilterType) => {
  const newId = Date.now();
  const newFilter: Filter = {
    id: newId,
    icon: type,
    text: 'New',
    frequency: 1000,
    gain: 0,
    Q: 0.71, // Default Q set to 0.71 as requested
    enabled: true,
  };
  filters.value.push(newFilter);
  setActiveFilter(newId); // Make the newly added filter active

  showAddFilterModal.value = false;
};

const removeFilter = (filterId: number) => {
  const indexToRemove = filters.value.findIndex(f => f.id === filterId);
  if (indexToRemove !== -1) {
    filters.value.splice(indexToRemove, 1);
    // If we removed the active filter, set active to first available filter or null
    if (activeFilterId.value === filterId) {
      activeFilterId.value = filters.value[0]?.id || null;
    }
  }
};

function incrementFilterFrequency(filter: Filter) {
  // Calculate logarithmic step size based on CONFIG_STEPS_PER_OCTAVE
  const logStep = Math.log2(2) / CONFIG_STEPS_PER_OCTAVE; // Each step is 1/10th of an octave
  const currentLog = Math.log2(filter.frequency);
  const newLog = currentLog + logStep;
  const newFreq = Math.pow(2, newLog);

  filter.frequency = Math.min(DEFAULT_FREQ_RANGE.max, Math.round(newFreq));
}

function decrementFilterFrequency(filter: Filter) {
  // Calculate logarithmic step size based on CONFIG_STEPS_PER_OCTAVE
  const logStep = Math.log2(2) / CONFIG_STEPS_PER_OCTAVE; // Each step is 1/10th of an octave
  const currentLog = Math.log2(filter.frequency);
  const newLog = currentLog - logStep;
  const newFreq = Math.pow(2, newLog);

  filter.frequency = Math.max(DEFAULT_FREQ_RANGE.min, Math.round(newFreq));
}

function incrementFilterGain(filter: Filter) {
  filter.gain = Math.min(25, filter.gain + 0.5);
}

function decrementFilterGain(filter: Filter) {
  filter.gain = Math.max(-25, filter.gain - 0.5);
}

function widenFilterBand(filter: Filter) {
  if (typeof filter.Q === 'number') {
    // Widening the band means DECREASING the Q value using logarithmic scaling
    filter.Q = Math.max(0.1, filter.Q / CONFIG_Q_STEP_FACTOR);
  }
}

function narrowFilterBand(filter: Filter) {
  if (typeof filter.Q === 'number') {
    // Narrowing the band means INCREASING the Q value using logarithmic scaling
    filter.Q = Math.min(25.0, filter.Q * CONFIG_Q_STEP_FACTOR);
  }
}

const startDrag = (e: MouseEvent, band: Filter) => {
  selectedBand.value = band;
  isDragging.value = true;
  setActiveFilter(band.id);
  if (svgElement.value) {
    svgElement.value.style.cursor = 'grabbing';
  }
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value || !selectedBand.value || !svgElement.value) return;

  const rect = svgElement.value.getBoundingClientRect();
  const xInPlot = e.clientX - rect.left - margin.left;
  const yInPlot = e.clientY - rect.top - margin.top;

  const clampedX = Math.max(0, Math.min(plotWidth.value, xInPlot));
  const clampedY = Math.max(0, Math.min(plotHeight.value, yInPlot));

  const newFreq = Math.round(xToFrequencyLocal(clampedX) / 10) * 10;
  const newGain = Math.round(yToGainLocal(clampedY));

  selectedBand.value.frequency = newFreq;
  selectedBand.value.gain = newGain;
};

const handleMouseUp = () => {
  isDragging.value = false;
  selectedBand.value = null;
  if (svgElement.value) {
    svgElement.value.style.cursor = 'grab';
  }
};

const formatHzForSVG = (val: number) => {
  if (val >= 1000) {
    return `${val / 1000}k`;
  }
  return `${val}`;
};

// **MODIFICATION 2: Updated updateSvgDimensions to set a fixed height**
const updateSvgDimensions = () => {
  if (graphContainer.value) {
    svgWidth.value = graphContainer.value.offsetWidth;
    // Set a fixed height here. This will override the initial ref value.
    // If you want it responsive but shorter, use Math.max(MIN_HEIGHT, graphContainer.value.offsetWidth / LARGER_DIVISOR);
    svgHeight.value = 500; // Example: Set to a fixed 100px. Adjust as needed (e.g., 80, 60).
  }
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && showAddFilterModal.value) {
    showAddFilterModal.value = false;
  }

  // Spacebar for bypass (common in audio software)
  if (e.code === 'Space' && !showAddFilterModal.value) {
    e.preventDefault(); // Prevent page scroll
    startBypass();
  }
};

const handleKeyup = (e: KeyboardEvent) => {
  // Release spacebar to end bypass
  if (e.code === 'Space' && !showAddFilterModal.value) {
    e.preventDefault();
    endBypass();
  }
};

onMounted(() => {
  updateSvgDimensions();
  window.addEventListener('resize', updateSvgDimensions);
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateSvgDimensions);
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('keyup', handleKeyup);
});

watch(filters, () => {
  filters.value.forEach((f) => {
    f.text = `${f.frequency}`;
  });
}, { deep: true });
</script>

<style scoped lang="scss">
@import '@/assets/scss/mixins.scss';

.sound-page {
  // Wrapper to ensure single root element for transitions
  width: 100%;
  height: 100%;
}

.sound {
  padding: 20px;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h1 {
      margin: 0;
      font-family: 'Metropolis', sans-serif;
      font-weight: 500;
      font-size: 28px;
    }

    .header-actions {
      display: flex;
      gap: 20px;

      svg {
        cursor: pointer;
        width: 24px;
        height: 24px;
        fill: #707070;
        transition: fill 0.2s ease;

        &:hover {
          fill: #e11e4a;
        }

        &.bypassed {
          fill: #00b8ff;
          filter: drop-shadow(0 0 4px rgba(0, 184, 255, 0.5));
        }
      }
    }
  }

  .card {
    padding: 10px;
    margin-bottom: 20px;
    border-radius: 8px;
    width: 100%;
  }

  .graph {
    position: relative;
    border-radius: 8px;
    width: 100%;

    svg {
      width: 100%;
      // **MODIFICATION 3: Removed or commented out height: 100%;**
      /* height: 100%; */
      // The height attribute bound via Vue (:height="svgHeight") will now control the height.
      overflow: visible;
      cursor: grab;

      .x-axis-labels,
      .y-axis-labels {
        font-family: 'Metropolis', sans-serif;
        font-weight: 400;
        font-size: 10px;
      }
    }
  }

  .equaliser-panel {
    .tabs {
      display: flex;
      flex-wrap: nowrap;

      .tab {
        flex: 1 1 50%;
        padding: 14px;
        cursor: pointer;
        font-family: 'Metropolis', sans-serif;
        font-size: 20px;
        border: 1px solid #333;
        border-right: none;
        transition: all 0.2s ease-in-out;
        background-color: transparent;
        color: #707070;

        &:first-child {
          border-radius: 8px 0 0 8px;
        }

        &:last-child {
          border-radius: 0 8px 8px 0;
          border-right: 1px solid #333;
        }

        &.active {
          background: #e11e4a;
          color: white;
          border-color: #e11e4a;
        }
      }
    }

    .filter-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 15px;

      .filter {
        padding: 15px 30px;
        border: 1px solid #707070;
        cursor: pointer;
        border-radius: 5px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease-in-out;
        background-color: transparent;

        svg {
          width: 24px;
          height: 24px;
        }

        &.active {
          color: #e11e4a;
          background: rgba(225, 30, 74, 0.1);
          border: 2px solid #e11e4a;

          svg {
            fill: #e11e4a;
          }
        }

        &.add-filter-button {
          background-color: transparent;
          color: #fff;
          border: 1px solid #707070;

          &:hover {
            background-color: rgba(255, 255, 255, 0.05);
          }

          &.active {
            background: transparent;
            color: #fff;
            border: 1px solid #707070;

            svg {
              fill: #fff;
            }
          }
        }

        .filter-text {
          margin-top: 5px;
          font-weight: 500;
          font-size: 14px;
        }
      }
    }

    .filter-control {
      margin-top: 20px;

      .control-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        border: 1px solid rgba(112, 112, 112, 0.5);
        border-radius: 8px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.02);
        backdrop-filter: blur(4px);
      }

      .control-item {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        border-right: 1px solid rgba(112, 112, 112, 0.5);

        &:last-child {
          border-right: none;
        }

        .control-value {
          width: 100%;
          text-align: center;
          padding: 12px;
          font-weight: 600;
          font-size: 16px;
          border-bottom: 1px solid rgba(112, 112, 112, 0.5);
          background: rgba(255, 255, 255, 0.05);

          .chevron {
            display: flex;
            justify-content: center;
            margin-top: 10px;
            gap: 20px;

            svg {
              cursor: pointer;

              &:hover {
                fill: #e11e4a;
              }
            }
          }
        }

        .control-label {
          width: 100%;
          text-align: center;
          padding: 12px;
          font-weight: 500;
          font-size: 14px;
        }
      }
    }

    .filter-header-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      margin-top: 15px;

      .save-listen-mode {
        color: #e11e4a;
        border: 2px solid #e11e4a;
        width: 100%;
        padding: 15px 0px;
        border-radius: 5px;
        font-size: 23px;
        font-weight: 500;
        background: transparent;
        cursor: pointer;
        transition: all 0.2s ease-in-out;

        &:hover {
          background-color: rgba(225, 30, 74, 0.1);
        }
      }

      .channel-text {
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
      }

      .more-option {
        display: flex;
        min-width: 90px;
        justify-content: space-between;
        margin: 11px 1px;

        svg {
          cursor: pointer;

          &:hover {
            fill: #e11e4a;
          }
        }
      }

      .icon-stroke path {
        stroke: #e11e4a !important;
        stroke-width: 2px;
        fill: none;
      }

      .remove-filter-text {
        color: #e11e4a;
        cursor: pointer;
        font-size: 14px;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    .channel-title {
      font-family: 'Metropolis', sans-serif;
      font-weight: 500;
      font-size: 20px;
      line-height: 1;
      margin: 15px 1px;
    }

    .filters-list {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 15px;

      .filter-item {
        padding: 20px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(112, 112, 112, 0.3);
        transition: all 0.2s ease-in-out;
        cursor: pointer;

        &.active {
          border-color: #e11e4a;
          background: rgba(225, 30, 74, 0.05);
        }

        &.add-filter-item {
          cursor: pointer;
          border-style: dashed;

          &:hover {
            border-color: #e11e4a;
            background: rgba(225, 30, 74, 0.05);
          }
        }

        &:hover:not(.add-filter-item) {
          border-color: rgba(225, 30, 74, 0.5);
          background: rgba(225, 30, 74, 0.02);
        }

        .filter-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;

          .filter-info {
            display: flex;
            align-items: center;
            gap: 15px;

            .filter-icon {
              width: 32px;
              height: 32px;
              fill: #e11e4a;
            }

            .filter-details {
              h3 {
                font-size: 18px;
                font-weight: 500;
                margin: 0 0 5px 0;
                color: #333;
              }

              .filter-frequency {
                font-size: 14px;
                color: #666;
              }
            }
          }

          .filter-actions {
            display: flex;
            align-items: center;
            gap: 15px;

            .filter-toggle {
              .toggle-switch {
                position: relative;
                display: inline-block;
                width: 44px;
                height: 24px;
                cursor: pointer;

                input {
                  opacity: 0;
                }

                .toggle-slider {
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background-color: #555;
                  transition: 0.3s;
                  border-radius: 24px;

                  &:before {
                    position: absolute;
                    content: '';
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.3s;
                    border-radius: 50%;
                  }
                }

                input:checked + .toggle-slider {
                  background-color: #e11e4a;
                }

                input:checked + .toggle-slider:before {
                  transform: translateX(20px);
                }
              }
            }

            .filter-remove {
              @include delete-button-small;
            }
          }
        }

        .filter-controls {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;

          .control-group {
            display: flex;
            flex-direction: column;
            align-items: center;

            label {
              font-size: 12px;
              color: #666;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .control-buttons {
              display: flex;
              align-items: center;
              gap: 10px;

              .control-btn {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(112, 112, 112, 0.5);
                border-radius: 4px;
                padding: 8px;
                cursor: pointer;
                transition: all 0.2s ease;

                &:hover {
                  background: rgba(225, 30, 74, 0.2);
                  border-color: #e11e4a;
                }

                svg {
                  width: 14px;
                  height: 14px;
                  fill: white;
                }
              }

              .control-value {
                font-size: 14px;
                font-weight: 500;
                min-width: 60px;
                text-align: center;
                color: #333;
              }
            }
          }
        }
      }
    }
  }

  .player-actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 16px;

    .player-toggle {
      display: flex;
      align-items: center;
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      cursor: pointer;

      input {
        opacity: 0;
      }

      .toggle-slider {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #555;
        transition: 0.3s;
        border-radius: 24px;

        &:before {
          position: absolute;
          content: '';
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }
      }

      input:checked+.toggle-slider {
        background-color: #e11e4a;
      }

      input:checked+.toggle-slider:before {
        transform: translateX(20px);
      }
    }
  }
}

@media (max-width: 768px) {
  .sound {
    padding: 10px;

    .equaliser-panel {
      .tabs {
        flex-wrap: nowrap;
      }

      .tabs .tab {
        font-size: 16px;
        padding: 10px;
      }

      .filter-control .control-grid {
        grid-template-columns: 1fr;
      }

      .filter-control .control-item {
        border-right: none;
        border-bottom: 1px solid rgba(112, 112, 112, 0.5);

        &:last-child {
          border-bottom: none;
        }
      }
    }
  }
}

@media (max-width: 480px) {
  .sound {
    .equaliser-panel {
      .tabs {
        flex-wrap: nowrap;
      }

      .tabs .tab {
        flex: 1 1 50%;
      }
    }
  }
}

/* Your existing SCSS styles remain unchanged as per the request */

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background-color: white;
  padding: 30px;
  border-radius: 10px;
  width: 400px;
  max-width: 90%;
  text-align: center;
  font-family: 'Metropolis', sans-serif;
  border: 1px solid #333;
  color: white;

  h2 {
    font-size: 22px;
    margin-bottom: 15px;
    color: black;
  }

  p {
    font-size: 16px;
    margin-bottom: 20px;
    color: black;
  }

  .filter-type-selector {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-bottom: 30px;

    .filter-type-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 15px 20px;
      border: 2px solid #ccc;
      border-radius: 8px;
      background-color: transparent;
      cursor: pointer;
      transition: all 0.3s ease;
      color: #333; // Text color for default state

      .filter-icon {
        width: 40px; // Make icon big
        height: 40px; // Make icon big
        margin-bottom: 8px; // Space between icon and name
        fill: #707070; // Default icon color
        transition: fill 0.3s ease;
      }

      .filter-name {
        font-size: 14px; // Adjust font size for the name
        font-weight: 500;
        text-transform: capitalize; // Capitalize the first letter of each word
      }

      &.selected {
        background-color: #e11e4a; // Fill color on click
        border-color: #e11e4a; // Border color on click
        color: white; // Text color when selected

        .filter-icon {
          fill: white; // Icon color when selected
        }
      }

      &:hover {
        background-color: rgba(225, 30, 74, 0.1); // Light background on hover
        border-color: #e11e4a;
      }
    }
  }
}
</style>
