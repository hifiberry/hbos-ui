<template>
  <div class="sound">
    <h1>Speaker Equaliser</h1>

    <div class="card">
      <div class="graph" ref="graphContainer" @mousemove="handleMouseMove" @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp">
        <svg ref="svgElement" :width="svgWidth" :height="svgHeight">
          <g :transform="`translate(${margin.left},${margin.top})`">
            <g stroke="#444" stroke-dasharray="4">
              <line v-for="y in gainGridLines" :key="'gain-grid-' + y" :y1="gainToY(y)" :y2="gainToY(y)" :x1="0"
                :x2="plotWidth" />
              <line v-for="f in freqGridLines" :key="'freq-grid-' + f" :x1="frequencyToX(f)" :x2="frequencyToX(f)"
                :y1="0" :y2="plotHeight" />
            </g>

            <line :x1="frequencyToX(wideBandStartFreq)" :x2="frequencyToX(wideBandStartFreq)" :y1="0" :y2="plotHeight"
              stroke="#e11e4a" stroke-width="1.5" stroke-dasharray="8 4" />
            <line :x1="frequencyToX(narrowBandStartFreq)" :x2="frequencyToX(narrowBandStartFreq)" :y1="0"
              :y2="plotHeight" stroke="#00b8ff" stroke-width="1.5" stroke-dasharray="4 2" />

            <template v-if="activeFilterGraphData">
              <path :d="activeFilterGraphData.areaPath" fill="rgba(0, 184, 255, 0.1)" stroke="none" />
              <path :d="activeFilterGraphData.linePath" stroke="#00b8ff" fill="none" stroke-width="2" />
            </template>
            <template v-else>
              <line :x1="0" :y1="gainToY(0)" :x2="plotWidth" :y2="gainToY(0)" stroke="#999" stroke-width="1"
                stroke-dasharray="2 2" />
            </template>

            <circle v-for="band in filters" :key="'node-' + band.id" :cx="frequencyToX(band.frequency)"
              :cy="gainToY(band.gain)" r="6" :fill="band.id === activeFilterId ? '#00b8ff' : '#999'"
              style="cursor: grab;" @mousedown.prevent="startDrag($event, band)" />
          </g>

          <g class="x-axis-labels" :transform="`translate(${margin.left}, ${svgHeight - margin.bottom + 5})`">
            <text v-for="f in freqGridLines" :key="'x-label-' + f" :x="frequencyToX(f)" y="0" text-anchor="middle"
              fill="#aaa" font-size="10">
              {{ formatHzForSVG(f) }}
            </text>
          </g>

          <g class="y-axis-labels" :transform="`translate(${margin.left - 5}, ${margin.top})`">
            <text v-for="g in gainGridLabels" :key="'y-label-' + g" x="0" :y="gainToY(g)" text-anchor="end"
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
          <button :class="['tab', { active: activeChannel === 'left' }]" @click="setActiveChannel('left')">
            Left Channel
          </button>
          <button :class="['tab', { active: activeChannel === 'right' }]" @click="setActiveChannel('right')">
            Right
          </button>
        </div>

        <div class="filters">
          <div class="filter-header-wrapper">
            <h3 class="channel-title">
              {{ activeChannel === 'left' ? 'Left Channel' : 'Right Channel' }}
            </h3>
            <div class="more-option">
              <AppIcon icon="link-unlinked" />
              <AppIcon icon="ear" />
              <AppIcon icon="more" />
            </div>
          </div>

          <div class="filter-buttons">
            <button v-for="filter in filters" :key="filter.id"
              :class="['filter', { active: activeFilterId === filter.id }]" @click="openFilterOptionsModal(filter)">
              <AppIcon :icon="filter.icon" :class="filter.icon === 'filter-peak' ? 'icon-stroke' : ''" />
              <div v-if="filter.text" class="filter-text">{{ filter.text }}</div>
            </button>
            <button class="filter add-filter-button" @click="showAddFilterModal = true">
              <AppIcon icon="plus" />
            </button>
          </div>
        </div>

        <div class="filters">
          <div class="filter-header-wrapper">
            <h3 class="channel-title">Filter Name</h3>
            <div class="remove-filter-text" @click="removeActiveFilter">
              - Remove Filter
            </div>
          </div>
          <div class="filter-header-wrapper">
            <h3 class="channel-title">On</h3>
            <div class="remove-filter-text">
              <div class="player-actions">
                <div class="player-toggle">
                  <label class="toggle-switch">
                    <input type="checkbox" v-model="eqEnabled" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="filter-control">
          <div class="control-grid">
            <div class="control-item">
              <div class="control-value">
                <div>{{ currentFilter.frequency }} Hz</div>
                <div class="chevron">
                  <AppIcon icon="chevron-thin-small-left" @click="decrementFrequency" />
                  <AppIcon icon="chevron-thin-small-right" @click="incrementFrequency" />
                </div>
              </div>
              <div class="control-label">Frequency</div>
            </div>
            <div class="control-item">
              <div class="control-value">
                <div>Q {{ activeFilterQDisplay }}</div>
                <div class="chevron">
                  <AppIcon icon="resize-wider" @click="decrementQ" />
                  <AppIcon icon="resize-narrower" @click="incrementQ" />
                </div>
              </div>
              <div class="control-label">Width</div>
            </div>
            <div class="control-item">
              <div class="control-value">
                <div>{{ currentFilter.gain }} dB</div>
                <div class="chevron">
                  <AppIcon icon="minus-small" @click="decrementGain" />
                  <AppIcon icon="plus-small" @click="incrementGain" />
                </div>
              </div>
              <div class="control-label">Gain</div>
            </div>
          </div>
        </div>

        <div class="filters">
          <div class="filter-header-wrapper">
            <h3 class="channel-title">Presets</h3>
            <div class="remove-filter-text">View Saved Presets</div>
          </div>
          <div class="filter-header-wrapper">
            <h3 class="channel-text">
              Current sound design can be saved to a listening mode preset.
            </h3>
          </div>
          <div class="filter-header-wrapper">
            <button class="save-listen-mode">Save Listening Mode</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <teleport to="body">
    <div v-if="showAddFilterModal" class="modal-backdrop" @click.self="showAddFilterModal = false">
      <div class="modal-content">
        <h2>Add New Filter</h2>
        <p>Select filter type before adding:</p>

        <div class="filter-type-selector">
          <button v-for="type in ['filter-peak', 'filter-low-shelf', 'filter-high-shelf']" :key="type"
            :class="['filter-type-option', { selected: selectedFilterType === type }]"
            @click="selectedFilterType = type">
            <AppIcon :icon="type" />
          </button>
        </div>

        <div class="modal-actions">
          <button :disabled="!selectedFilterType" @click="confirmAddFilter">Confirm</button>
          <button @click="showAddFilterModal = false; selectedFilterType = null">Cancel</button>
        </div>
      </div>
    </div>

    <div v-if="showFilterOptionsModal" class="modal-backdrop" @click.self="showFilterOptionsModal = false">
      <div class="modal-content">
        <h2>Filter Options</h2>
        <p>What would you like to do with this filter?</p>

        <div class="modal-actions">
          <button @click="handleViewGraph">View Graph</button>
          <button @click="handleDeleteFilter" class="delete-button">Delete Filter</button>
          <button @click="showFilterOptionsModal = false; filterToOperateOn = null">Cancel</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import AppIcon from '@/components/app-icon.vue';

// --- Types ---
type Channel = 'left' | 'right';

interface Filter {
  id: number;
  icon: string;
  text: string;
  frequency: number;
  gain: number;
  Q?: number; // Q is optional for some filter types, but we'll use a default if not present
  enabled: boolean;
}

// --- State ---
const activeChannel = ref<Channel>('left');
const selectedFilterType = ref<string | null>(null);
const filters = ref<Filter[]>([
  { id: 1, icon: 'filter-peak', text: '1000', frequency: 1000, gain: 0, Q: 8.71, enabled: true },
  { id: 2, icon: 'filter-low-shelf', text: '50', frequency: 50, gain: -20, Q: 8.71, enabled: true },
  { id: 3, icon: 'filter-high-shelf', text: '8000', frequency: 8000, gain: 10, Q: 8.71, enabled: true },
]);
const showAddFilterModal = ref(false);
const showFilterOptionsModal = ref(false);
const filterToOperateOn = ref<Filter | null>(null); // Used to pass filter data to the options modal

const activeFilterId = ref<number | null>(filters.value[0]?.id || null);
const eqEnabled = ref(true);

const isDragging = ref(false);
const svgElement = ref<SVGSVGElement | null>(null);
const selectedBand = ref<Filter | null>(null); // The band currently being dragged

const graphContainer = ref<HTMLDivElement | null>(null); // Corrected to HTMLDivElement

const svgWidth = ref(900);
const svgHeight = ref(300);

const margin = { top: 10, right: 30, bottom: 30, left: 50 };
const plotWidth = computed(() => svgWidth.value - margin.left - margin.right);
const plotHeight = computed(() => svgHeight.value - margin.top - margin.bottom);

const gainGridLines = [-25, -15, -5, 0, 5, 15, 25];
const gainGridLabels = [-25, -15, -5, 0, 5, 15, 25];

// Define the frequencies for your two new vertical lines
const wideBandStartFreq = ref(300);
const narrowBandStartFreq = ref(1500);

// --- Graph Scaling Functions ---

/**
 * Converts a frequency value to an X-coordinate on the SVG plot (logarithmic scale).
 * @param freq The frequency in Hz.
 * @returns The X-coordinate.
 */
const frequencyToX = (freq: number) => {
  const logMinFreq = Math.log10(20);
  const logMaxFreq = Math.log10(10000);
  const logFreq = Math.log10(freq);
  return ((logFreq - logMinFreq) / (logMaxFreq - logMinFreq)) * plotWidth.value;
};

/**
 * Converts an X-coordinate on the SVG plot back to a frequency value.
 * @param x The X-coordinate.
 * @returns The frequency in Hz.
 */
const xToFrequency = (x: number) => {
  const logMinFreq = Math.log10(20);
  const logMaxFreq = Math.log10(10000);
  const logFreq = logMinFreq + (x / plotWidth.value) * (logMaxFreq - logMinFreq);
  return Math.pow(10, logFreq);
};

/**
 * Converts a gain value (dB) to a Y-coordinate on the SVG plot.
 * @param gain The gain in dB.
 * @returns The Y-coordinate.
 */
const gainToY = (gain: number) => {
  const minGain = -25;
  const maxGain = 25;
  return plotHeight.value - ((gain - minGain) / (maxGain - minGain)) * plotHeight.value;
};

/**
 * Converts a Y-coordinate on the SVG plot back to a gain value (dB).
 * @param y The Y-coordinate.
 * @returns The gain in dB.
 */
const yToGain = (y: number) => {
  const minGain = -25;
  const maxGain = 25;
  return maxGain - (y / plotHeight.value) * (maxGain - minGain);
};

// --- Filter Gain Calculation ---

/**
 * Calculates the gain at a specific frequency for a given filter band.
 * This is a simplified model for visualization, not a precise audio DSP implementation.
 * @param freq The frequency at which to calculate gain.
 * @param band The filter band object.
 * @returns The calculated gain in dB.
 */
const calculateFilterGain = (freq: number, band: Filter): number => {
  if (!band.enabled) return 0; // If filter is disabled, it contributes no gain

  const A = band.gain; // Max gain for the filter
  const Fc = band.frequency; // Center/cutoff frequency
  const Q = band.Q || 8.71; // Q factor, default to 0.71 if not set

  // Ensure Q is a positive number to prevent division by zero or invalid calculations
  const safeQ = Math.max(0.01, Q);

  // Apply the same peak/bell filter calculation for all types for visualization
  const normalizedLogFreq = Math.log10(freq / Fc);
  const widthFactor = 1 / safeQ;
  let gainVal = A * Math.exp(-Math.pow(normalizedLogFreq / widthFactor, 2));

  return gainVal;
};

// --- Computed Properties ---

const currentFilter = computed(() => {
  // Returns the currently active filter or a default empty filter object
  return filters.value.find((f) => f.id === activeFilterId.value) || {
    id: 0,
    icon: 'filter-peak',
    text: '',
    frequency: 1000,
    gain: 0,
    Q: 8.71,
    enabled: true,
  };
});

// **UPDATED**: Dynamically generate frequency grid lines
const freqGridLines = computed(() => {
  const minOverallFreq = 20;
  const maxOverallFreq = 10000;
  const lines: Set<number> = new Set(); // Use a Set to automatically handle unique values

  // Add major decade lines: 100, 1000, 10000
  for (let i = 100; i <= maxOverallFreq; i *= 10) {
    if (i >= minOverallFreq) {
      lines.add(i);
    }
  }

  // Add intermediate lines (e.g., 20, 50, 200, 500, 2000, 5000)
  const multipliers = [2, 5]; // for 2x and 5x of the decade
  for (let i = 10; i < maxOverallFreq * 2; i *= 10) { // Iterate a bit beyond max to catch 20, 50
    for (const mult of multipliers) {
      const freq = i * mult;
      if (freq >= minOverallFreq && freq <= maxOverallFreq) {
        lines.add(freq);
      }
    }
  }

  // Ensure wideBandStartFreq and narrowBandStartFreq are also part of the lines
  // Round them to typical Hz values to avoid very specific, odd numbers if they're dragged
  const roundedWideBand = Math.round(wideBandStartFreq.value / 10) * 10;
  const roundedNarrowBand = Math.round(narrowBandStartFreq.value / 10) * 10;

  if (roundedWideBand >= minOverallFreq && roundedWideBand <= maxOverallFreq) {
    lines.add(roundedWideBand);
  }
  if (roundedNarrowBand >= minOverallFreq && roundedNarrowBand <= maxOverallFreq) {
    lines.add(roundedNarrowBand);
  }

  // Convert Set to Array, sort, and filter to ensure no exact duplicates
  return Array.from(lines)
    .filter(f => f >= minOverallFreq && f <= maxOverallFreq) // Final check within bounds
    .sort((a, b) => a - b);
});


const activeFilterGraphData = computed(() => {
  if (!eqEnabled.value || !activeFilterId.value) {
    return null; // Don't draw graph if EQ is off or no filter is active
  }

  const band = filters.value.find(f => f.id === activeFilterId.value);
  if (!band || !band.enabled) {
    return null; // Don't draw graph if the active filter is disabled
  }

  const linePoints: string[] = [];
  const areaPoints: string[] = [];
  const baselineY = gainToY(0); // Y-coordinate for 0 dB gain

  // Start the area path at the bottom-left of the graph
  areaPoints.push(`${frequencyToX(20)},${baselineY}`);

  const minFreq = 20;
  const maxFreq = 10000;
  const numPoints = 200; // Number of points to sample for the curve

  for (let i = 0; i <= numPoints; i++) {
    // Calculate frequency on a logarithmic scale for even distribution across the graph
    const logFreq = Math.log10(minFreq) + (i / numPoints) * (Math.log10(maxFreq) - Math.log10(minFreq));
    const freq = Math.pow(10, logFreq);

    const x = frequencyToX(freq);
    const gainVal = calculateFilterGain(freq, band);
    const y = gainToY(gainVal);

    linePoints.push(`${x},${y}`);
    areaPoints.push(`${x},${y}`);
  }

  // Complete the area path back to the bottom-right and then bottom-left
  areaPoints.push(`${frequencyToX(10000)},${baselineY}`);
  areaPoints.push(`${frequencyToX(20)},${baselineY}`); // Close the path

  return {
    linePath: `M ${linePoints.join(' L ')}`, // SVG path for the line
    areaPath: `M ${areaPoints.join(' L ')}` // SVG path for the filled area
  };
});

const activeFilterQDisplay = computed(() => {
  // Displays Q value, formatted to 2 decimal places
  return currentFilter.value.Q ? currentFilter.value.Q.toFixed(2) : 'N/A';
});

// --- Methods ---

function setActiveChannel(channel: Channel) {
  activeChannel.value = channel;
  // Potentially load filters specific to this channel here
}

function setActiveFilter(id: number) {
  activeFilterId.value = id;
}

function openFilterOptionsModal(filter: Filter) {
  filterToOperateOn.value = filter;
  showFilterOptionsModal.value = true;
}

function handleViewGraph() {
  if (filterToOperateOn.value) {
    setActiveFilter(filterToOperateOn.value.id);
  }
  showFilterOptionsModal.value = false;
  filterToOperateOn.value = null; // Clear the temporary filter
}

function handleDeleteFilter() {
  if (filterToOperateOn.value) {
    const indexToRemove = filters.value.findIndex(f => f.id === filterToOperateOn.value!.id);
    if (indexToRemove !== -1) {
      filters.value.splice(indexToRemove, 1);
      // If the deleted filter was active, set the first available filter as active, or null if none
      if (activeFilterId.value === filterToOperateOn.value.id) {
        activeFilterId.value = filters.value[0]?.id || null;
      }
    }
  }
  showFilterOptionsModal.value = false;
  filterToOperateOn.value = null; // Clear the temporary filter
}

const confirmAddFilter = () => {
  if (!selectedFilterType.value) return;

  const newId = Date.now(); // Simple unique ID
  const newFilter: Filter = {
    id: newId,
    icon: selectedFilterType.value,
    text: 'New', // Default text
    frequency: 1000,
    gain: 0,
    Q: 8.71,
    enabled: true,
  };
  filters.value.push(newFilter);
  setActiveFilter(newId); // Make the new filter active

  selectedFilterType.value = null; // Reset selected type
  showAddFilterModal.value = false;
};

const removeActiveFilter = () => {
  if (!activeFilterId.value) return;

  const indexToRemove = filters.value.findIndex(f => f.id === activeFilterId.value);
  if (indexToRemove !== -1) {
    filters.value.splice(indexToRemove, 1);
    activeFilterId.value = filters.value[0]?.id || null; // Set first filter as active or null
  }
};

// --- Filter Control Adjustments ---

function incrementFrequency() {
  const filter = currentFilter.value;
  if (filter) {
    // Round to nearest 10 for frequency adjustments
    filter.frequency = Math.min(10000, Math.round((filter.frequency + 100) / 10) * 10);
  }
}

function decrementFrequency() {
  const filter = currentFilter.value;
  if (filter) {
    filter.frequency = Math.max(20, Math.round((filter.frequency - 100) / 10) * 10);
  }
}

function incrementGain() {
  const filter = currentFilter.value;
  if (filter) {
    filter.gain = Math.min(25, filter.gain + 1);
  }
}

function decrementGain() {
  const filter = currentFilter.value;
  if (filter) {
    filter.gain = Math.max(-25, filter.gain - 1);
  }
}

function incrementQ() {
  const filter = currentFilter.value;
  if (filter && typeof filter.Q === 'number') {
    filter.Q = parseFloat((filter.Q + 0.1).toFixed(2));
    if (filter.Q > 10) filter.Q = 10;
  }
}

function decrementQ() {
  const filter = currentFilter.value;
  if (filter && typeof filter.Q === 'number') {
    filter.Q = parseFloat((filter.Q - 0.1).toFixed(2));
    if (filter.Q < 0.1) filter.Q = 0.1;
  }
}

// --- Dragging Logic for Graph Nodes ---

const startDrag = (e: MouseEvent, band: Filter) => {
  selectedBand.value = band;
  isDragging.value = true;
  setActiveFilter(band.id); // Make the dragged filter active
  if (svgElement.value) {
    svgElement.value.style.cursor = 'grabbing'; // Change cursor while dragging
  }
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value || !selectedBand.value || !svgElement.value) return;

  const rect = svgElement.value.getBoundingClientRect();
  // Calculate coordinates relative to the SVG plot area
  const xInPlot = e.clientX - rect.left - margin.left;
  const yInPlot = e.clientY - rect.top - margin.top;

  // Clamp coordinates within the plot boundaries
  const clampedX = Math.max(0, Math.min(plotWidth.value, xInPlot));
  const clampedY = Math.max(0, Math.min(plotHeight.value, yInPlot));

  // Convert clamped coordinates back to frequency and gain
  // Round frequency to nearest 10 Hz for cleaner values
  const newFreq = Math.round(xToFrequency(clampedX) / 10) * 10;
  // Round gain to nearest integer
  const newGain = Math.round(yToGain(clampedY));

  // Update the selected filter's properties
  selectedBand.value.frequency = newFreq;
  selectedBand.value.gain = newGain;
};

const handleMouseUp = () => {
  isDragging.value = false;
  selectedBand.value = null; // Clear selected band
  if (svgElement.value) {
    svgElement.value.style.cursor = 'grab'; // Reset cursor
  }
};

// --- Utility Functions ---

/**
 * Formats frequency for SVG labels (e.g., 1000 -> 1k).
 * @param val Frequency value.
 * @returns Formatted string.
 */
const formatHzForSVG = (val: number) => {
  if (val >= 1000) {
    return `${val / 1000}k`;
  }
  return `${val}`;
};

/**
 * Updates SVG dimensions based on parent container size.
 */
const updateSvgDimensions = () => {
  if (graphContainer.value) {
    svgWidth.value = graphContainer.value.offsetWidth;
    // Maintain a minimum height and scale height proportionally with width
    svgHeight.value = Math.max(300, graphContainer.value.offsetWidth / 3);
  }
};

// --- Lifecycle Hooks ---

onMounted(() => {
  updateSvgDimensions();
  window.addEventListener('resize', updateSvgDimensions);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateSvgDimensions);
});

// --- Watchers ---

// Updates filter text when frequency changes
watch(filters, () => {
  filters.value.forEach((f) => {
    f.text = `${f.frequency}`;
  });
}, { deep: true }); // Deep watch is important for reactivity on nested filter properties

// Watch for changes in wideBandStartFreq and narrowBandStartFreq to ensure grid updates
watch([wideBandStartFreq, narrowBandStartFreq], () => {
  // The freqGridLines computed property will automatically re-evaluate
  // when these reactive references change. No explicit action needed here,
  // as the computed property already depends on these.
});
</script>

<style scoped lang="scss">
/* Your existing SCSS styles remain unchanged as per the request */

.sound {
  padding: 20px;

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
      height: 100%;
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

  .modal-actions {
    display: flex;
    justify-content: center;
    gap: 20px;

    button {
      padding: 10px 20px;
      font-size: 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      color: white;

      &:first-child {
        background-color: #e11e4a;

        &:hover {
          background-color: #c71a3f;
        }
      }

      &:last-child {
        background-color: #555;

        &:hover {
          background-color: #777;
        }
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &.delete-button {
        background-color: #dc3545;

        &:hover {
          background-color: #c82333;
        }
      }
    }
  }
}
</style>