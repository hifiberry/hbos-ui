<template>
  <div class="sound-page">
    <div class="sound">
      <div class="page-header">
        <div class="title-section">
          <h1>Speaker Equaliser {{ channelMode === 'both' ? 'Both' : (activeChannel === 'left' ? 'Left' : 'Right') }}</h1>
          <div class="backend-info" v-if="backendName">
            <span class="backend-name" @click="showBackendInfoModal = true">{{ backendName }}</span>
            <span class="filter-limits" v-if="currentChannelFilterInfo">
              • {{ currentChannelFilterInfo.currentFilterCount }}/{{ currentChannelFilterInfo.maxFilters }} filters
            </span>
          </div>
        </div>
        <div class="header-actions">
          <img src="/images/svg/link.svg"
            @click="toggleChannelMode"
            title="Channel Mode"
            :class="{ linked: channelMode === 'both' }"
            class="icon-btn" />
          <img src="/images/svg/ear.svg"
            @mousedown="startBypass"
            @mouseup="endBypass"
            @mouseleave="endBypass"
            @touchstart="startBypass"
            @touchend="endBypass"
            :class="{ bypassed: isBypassed }"
            class="icon-btn"
            title="Bypass" />
          <img src="/images/svg/folder_open.svg" @click="loadEQSettings" title="Load EQ Settings" class="icon-btn" />
          <img src="/images/svg/save.svg" @click="saveEQSettings" title="Save EQ Settings" class="icon-btn" />
        </div>
      </div>
      <div class="card">
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
                <!-- Bandwidth indicator area and lines -->
                <template v-if="SHOW_BANDWIDTH_LINES && activeFilterBandwidthStart !== null && activeFilterBandwidthEnd !== null">
                  <!-- Light shaded area between bandwidth lines -->
                  <rect :x="frequencyToXLocal(activeFilterBandwidthStart)" :y="0"
                        :width="frequencyToXLocal(activeFilterBandwidthEnd) - frequencyToXLocal(activeFilterBandwidthStart)"
                        :height="plotHeight"
                        fill="rgba(0, 184, 255, 0.03)" stroke="none" />
                  <!-- Draggable bandwidth indicator lines -->
                  <line :x1="frequencyToXLocal(activeFilterBandwidthStart)" :x2="frequencyToXLocal(activeFilterBandwidthStart)"
                    :y1="0" :y2="plotHeight" stroke="#00b8ff" stroke-width="1" stroke-dasharray="4 2" />
                  <line :x1="frequencyToXLocal(activeFilterBandwidthEnd)" :x2="frequencyToXLocal(activeFilterBandwidthEnd)" :y1="0"
                    :y2="plotHeight" stroke="#00b8ff" stroke-width="1" stroke-dasharray="4 2" />

                  <!-- Invisible wider hit areas for easier dragging -->
                  <line :x1="frequencyToXLocal(activeFilterBandwidthStart)" :x2="frequencyToXLocal(activeFilterBandwidthStart)"
                    :y1="0" :y2="plotHeight" stroke="transparent" stroke-width="16"
                    @mousedown.prevent="startBandwidthDrag($event, 'start')" @dragstart.prevent
                    style="cursor: ew-resize;" />
                  <line :x1="frequencyToXLocal(activeFilterBandwidthEnd)" :x2="frequencyToXLocal(activeFilterBandwidthEnd)" :y1="0"
                    :y2="plotHeight" stroke="transparent" stroke-width="16"
                    @mousedown.prevent="startBandwidthDrag($event, 'end')" @dragstart.prevent
                    style="cursor: ew-resize;" />
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

              <circle v-for="band in filters.filter(f => f.icon !== 'generic_normalized')" :key="'node-' + band.id" :cx="frequencyToXLocal(band.frequency)"
                :cy="gainToYLocal(band.gain)" r="6" :fill="band.id === activeFilterId ? '#00b8ff' : '#999'" />

              <!-- Invisible larger hit areas for filter nodes -->
              <circle v-for="band in filters.filter(f => f.icon !== 'generic_normalized')" :key="'hit-area-' + band.id" :cx="frequencyToXLocal(band.frequency)"
                :cy="gainToYLocal(band.gain)" r="12" fill="transparent"
                @mousedown.prevent="startDrag($event, band)" @dragstart.prevent
                style="cursor: grab;" />
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
                    <h3 v-if="filter.icon === 'generic_normalized'">
                      {{ formatFilterTypeName(filter.icon) }} |
                      b0={{ filter.genericCoeffs?.b0 || 1 }}
                      b1={{ filter.genericCoeffs?.b1 || 0 }}
                      b2={{ filter.genericCoeffs?.b2 || 0 }}
                      a1={{ filter.genericCoeffs?.a1 || 0 }}
                      a2={{ filter.genericCoeffs?.a2 || 0 }}
                    </h3>
                    <h3 v-else>
                      {{ formatFilterTypeName(filter.icon) }} | {{ filter.frequency }} Hz | {{ filter.gain }} dB | Q {{ filter.Q ? filter.Q.toFixed(2) : 'N/A' }}
                    </h3>
                  </div>
                </div>
                <div class="filter-actions" @click.stop>
                  <div class="filter-toggle">
                    <label class="toggle-switch">
                      <input type="checkbox" :checked="filter.enabled" @change="toggleFilterEnabled(filter)" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                  <div class="filter-remove" @click="removeFilter(filter.id)">
                    <AppIcon icon="close" />
                  </div>
                </div>
              </div>

              <div class="filter-controls" @click.stop>
                <!-- Standard filter controls for non-generic filters -->
                <template v-if="filter.icon !== 'generic_normalized'">
                  <div class="standard-controls">
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
                </template>

                <!-- Generic biquad coefficient controls -->
                <template v-else>
                  <div class="generic-coefficients">
                    <div class="coefficient-inputs">
                      <div class="coefficient-group">
                        <label>b0</label>
                        <input type="number" step="0.001"
                               :value="filter.genericCoeffs?.b0 || 1"
                               @input="updateGenericCoeff(filter, 'b0', $event)"
                               placeholder="1.000" />
                      </div>
                      <div class="coefficient-group">
                        <label>b1</label>
                        <input type="number" step="0.001"
                               :value="filter.genericCoeffs?.b1 || 0"
                               @input="updateGenericCoeff(filter, 'b1', $event)"
                               placeholder="0.000" />
                      </div>
                      <div class="coefficient-group">
                        <label>b2</label>
                        <input type="number" step="0.001"
                               :value="filter.genericCoeffs?.b2 || 0"
                               @input="updateGenericCoeff(filter, 'b2', $event)"
                               placeholder="0.000" />
                      </div>
                      <div class="coefficient-group">
                        <label>a1</label>
                        <input type="number" step="0.001"
                               :value="filter.genericCoeffs?.a1 || 0"
                               @input="updateGenericCoeff(filter, 'a1', $event)"
                               placeholder="0.000" />
                      </div>
                      <div class="coefficient-group">
                        <label>a2</label>
                        <input type="number" step="0.001"
                               :value="filter.genericCoeffs?.a2 || 0"
                               @input="updateGenericCoeff(filter, 'a2', $event)"
                               placeholder="0.000" />
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="filter-item add-filter-item"
                 :class="{ disabled: !canAddFilterToCurrentChannel }"
                 @click="canAddFilterToCurrentChannel && (showAddFilterModal = true)">
              <div class="filter-main">
                <div class="filter-info">
                  <AppIcon icon="plus" class="filter-icon" />
                  <div class="filter-details">
                    <h3>{{ canAddFilterToCurrentChannel ? 'Add New Filter' : 'Maximum Filters Reached' }}</h3>
                    <div class="filter-frequency">
                      <span v-if="currentChannelFilterInfo">
                        {{ currentChannelFilterInfo.currentFilterCount }}/{{ currentChannelFilterInfo.maxFilters }} filters
                      </span>
                      <span v-else-if="canAddFilterToCurrentChannel">Click to add</span>
                      <span v-else>Cannot add more filters</span>
                    </div>
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

      <div v-if="showBackendInfoModal" class="modal-backdrop" @click.self="showBackendInfoModal = false">
        <div class="modal-content backend-info-modal">
          <div class="modal-header">
            <h2>{{ backendCapabilities?.backendName || 'Backend' }} Information</h2>
            <button class="close-btn" @click="showBackendInfoModal = false">×</button>
          </div>
          <div class="modal-body" v-html="backendCapabilities?.backendDescription"></div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import AppIcon from '@/components/app-icon.vue';
import { useFilterStore, type Filter as StoreFilter, type BackendCapabilities } from '@/stores/filter_connector';
import {
  type Filter,
  calculateFilterGain
} from '@/utils/filtercalc';

import {
  type BiquadFilterType,
  calculateBiquadBandwidth,
  createBiquadFilter,
  FILTER_TYPES,
  bandwidthToQ
} from '@/utils/biquad';

import {
  frequencyToX,
  xToFrequency,
  gainToY,
  yToGain,
  generateFrequencyGridLines,
  generateFrequencyLabels,
  generateGainGridLines,
  DEFAULT_FREQ_RANGE,
  DEFAULT_GAIN_RANGE
} from '@/utils/filtergraph';

// Constants
const SAMPLE_RATE = 48000; // Default sample rate for biquad calculations
const CONFIG_STEPS_PER_OCTAVE = 10; // Number of frequency steps per octave for logarithmic scaling
const CONFIG_Q_STEP_FACTOR = 1.07; // Logarithmic step factor for Q value changes
const EQ_FILE_PREFIX = 'speaker-eq'; // File prefix for save/load functionality
const SHOW_BANDWIDTH_LINES = true; // Global setting to enable/disable bandwidth indicator lines

// Available filter types for the UI
const AVAILABLE_FILTER_TYPES: BiquadFilterType[] = ['lowshelf', 'peaking', 'highshelf', 'generic_normalized'];

// Helper functions for filter type display
const getFilterIconName = (type: BiquadFilterType): string => {
  switch (type) {
    case 'lowshelf': return 'filter-low-shelf';
    case 'peaking': return 'filter-peak';
    case 'highshelf': return 'filter-high-shelf';
    case 'generic_normalized': return 'math-function';
    default: return 'filter-peak';
  }
};

const formatFilterTypeName = (type: BiquadFilterType): string => {
  switch (type) {
    case 'lowshelf': return 'Low Shelfing';
    case 'peaking': return 'Peaking EQ';
    case 'highshelf': return 'High Shelfing';
    case 'generic_normalized': return 'Generic Biquad';
    default: return type;
  }
};

type Channel = 'left' | 'right';
type ChannelMode = 'individual' | 'both';

// Initialize filter store
const filterStore = useFilterStore();

// Backend capabilities and filter limits
const backendCapabilities = ref<BackendCapabilities | null>(null);
const backendName = ref('');

// Load backend capabilities on mount
const loadBackendCapabilities = async () => {
  try {
    backendCapabilities.value = await filterStore.getBackendCapabilities();
    backendName.value = backendCapabilities.value?.backendName || '';
    console.log('Backend capabilities loaded:', backendCapabilities.value);
  } catch (error) {
    console.error('Failed to load backend capabilities:', error);
  }
};

// Computed property to check if current channel can accept more filters
const canAddFilterToCurrentChannel = computed(() => {
  if (!backendCapabilities.value) return false;

  const currentBankName = activeChannel.value;
  const bankInfo = backendCapabilities.value.availableFilterBanks.find(
    bank => bank.name === currentBankName
  );

  if (!bankInfo) return false;

  return bankInfo.currentFilterCount < bankInfo.maxFilters;
});

// Computed property to get current filter count and limit for UI display
const currentChannelFilterInfo = computed(() => {
  if (!backendCapabilities.value) return null;

  const currentBankName = activeChannel.value;
  const bankInfo = backendCapabilities.value.availableFilterBanks.find(
    bank => bank.name === currentBankName
  );

  return bankInfo;
});

// Helper functions to convert between UI Filter and Store Filter types
const convertUIFilterToStore = (uiFilter: Filter): Omit<StoreFilter, 'id'> => {
  // Map UI filter types to store filter types
  const typeMapping: Record<string, StoreFilter['type']> = {
    'lowshelf': 'shelf-low',
    'peaking': 'peak',
    'highshelf': 'shelf-high',
    'highpass': 'highpass',
    'lowpass': 'lowpass',
    'bandpass': 'bandpass',
    'bandstop': 'bandstop',
    'allpass': 'allpass'
  };

  return {
    type: typeMapping[uiFilter.icon] || 'peak',
    frequency: uiFilter.frequency,
    gain: uiFilter.gain,
    q: uiFilter.Q,
    enabled: uiFilter.enabled
  };
};

// Initialize filter banks in the store
onMounted(async () => {
  // Initialize backend from settingsDB first
  await filterStore.initializeBackend();

  // Load backend capabilities first
  await loadBackendCapabilities();

  // Create both current and prepare for future channel expansion
  const currentChannels = ['left', 'right'];
  await filterStore.createMultipleFilterBanks(currentChannels);

  // Add initial filters to the store
  for (const [index, filter] of leftFilters.value.entries()) {
    await filterStore.addFilter('left', index, convertUIFilterToStore(filter));
  }

  for (const [index, filter] of rightFilters.value.entries()) {
    await filterStore.addFilter('right', index, convertUIFilterToStore(filter));
  }

  // Reload capabilities after adding initial filters to get updated counts
  await loadBackendCapabilities();
});

const activeChannel = ref<Channel>('left');
const channelMode = ref<ChannelMode>('individual');

// Separate filter banks for left and right channels
const leftFilters = ref<Filter[]>([
  { id: 1, icon: 'peaking', text: '1000', frequency: 1000, gain: 0, Q: 0.71, enabled: true } // Initial filter with Q=0.71
]);
const rightFilters = ref<Filter[]>([
  { id: 2, icon: 'peaking', text: '1000', frequency: 1000, gain: 0, Q: 0.71, enabled: true } // Initial filter with Q=0.71
]);

// Computed property for current filters based on channel mode
const filters = computed(() => {
  if (channelMode.value === 'both') {
    // In both mode, show filters from the active channel
    return activeChannel.value === 'left' ? leftFilters.value : rightFilters.value;
  } else {
    // In individual mode, show filters from the active channel
    return activeChannel.value === 'left' ? leftFilters.value : rightFilters.value;
  }
});

const showAddFilterModal = ref(false);
const showBackendInfoModal = ref(false);

// Bypass functionality state
const isBypassed = ref(false);
const previousFilterStates = ref<Map<string, boolean>>(new Map());

const activeFilterId = ref<number | null>(leftFilters.value[0]?.id || null);

const isDragging = ref(false);
const svgElement = ref<SVGSVGElement | null>(null);
const selectedBand = ref<Filter | null>(null);

// Bandwidth dragging state
const isDraggingBandwidth = ref(false);
const bandwidthDragSide = ref<'start' | 'end' | null>(null);
const draggingFilter = ref<Filter | null>(null);

const graphContainer = ref<HTMLDivElement | null>(null);

// **MODIFICATION 1: Initial svgHeight set to a smaller fixed value**
const svgWidth = ref(900);
const svgHeight = ref(100); // Set a smaller initial height, e.g., 100px

const margin = { top: 10, right: 30, bottom: 30, left: 50 };
const plotWidth = computed(() => svgWidth.value - margin.left - margin.right);
const plotHeight = computed(() => svgHeight.value - margin.top - margin.bottom);

const gainGridLines = generateGainGridLines();
const gainGridLabels = generateGainGridLines();

// MODIFIED: Computed properties for dynamic bandwidth lines using biquad calculations
const activeFilterBandwidthStart = computed(() => {
  const filter = currentFilter.value;

  // Generic filters don't have bandwidth
  if (filter.icon === 'generic_normalized') {
    return null;
  }

  // Convert our Filter type to BiquadFilter type for the bandwidth calculation
  if (typeof filter.Q === 'number' && filter.Q > 0 && filter.frequency > 0) {
    // Map filter icon to biquad filter type
    let biquadType: BiquadFilterType;
    switch (filter.icon) {
      case 'peaking':
        biquadType = FILTER_TYPES.PEAKING;
        break;
      case 'lowshelf':
        biquadType = FILTER_TYPES.LOWSHELF;
        break;
      case 'highshelf':
        biquadType = FILTER_TYPES.HIGHSHELF;
        break;
      default:
        biquadType = FILTER_TYPES.PEAKING;
    }

    const biquadFilter = createBiquadFilter(
      biquadType,
      filter.frequency,
      filter.gain || 0,
      filter.Q,
      SAMPLE_RATE
    );

    const bandwidth = calculateBiquadBandwidth(biquadFilter);
    return bandwidth ? bandwidth.lowerFreq : null;
  }
  return null;
});

const activeFilterBandwidthEnd = computed(() => {
  const filter = currentFilter.value;

  // Generic filters don't have bandwidth
  if (filter.icon === 'generic_normalized') {
    return null;
  }

  // Convert our Filter type to BiquadFilter type for the bandwidth calculation
  if (typeof filter.Q === 'number' && filter.Q > 0 && filter.frequency > 0) {
    // Map filter icon to biquad filter type
    let biquadType: BiquadFilterType;
    switch (filter.icon) {
      case 'peaking':
        biquadType = FILTER_TYPES.PEAKING;
        break;
      case 'lowshelf':
        biquadType = FILTER_TYPES.LOWSHELF;
        break;
      case 'highshelf':
        biquadType = FILTER_TYPES.HIGHSHELF;
        break;
      default:
        biquadType = FILTER_TYPES.PEAKING;
    }

    const biquadFilter = createBiquadFilter(
      biquadType,
      filter.frequency,
      filter.gain || 0,
      filter.Q,
      SAMPLE_RATE
    );

    const bandwidth = calculateBiquadBandwidth(biquadFilter);
    return bandwidth ? bandwidth.upperFreq : null;
  }
  return null;
});

// Wrapper functions to maintain compatibility with existing template code
const frequencyToXLocal = (freq: number) => frequencyToX(freq, plotWidth.value);
const xToFrequencyLocal = (x: number) => xToFrequency(x, plotWidth.value);
const gainToYLocal = (gain: number) => gainToY(gain, plotHeight.value);
const yToGainLocal = (y: number) => yToGain(y, plotHeight.value);

// Helper functions for managing channel-specific filters
const getCurrentFilterArray = () => {
  return activeChannel.value === 'left' ? leftFilters.value : rightFilters.value;
};

const setCurrentFilterArray = (newFilters: Filter[]) => {
  if (channelMode.value === 'both') {
    // When in both mode, update both channels
    leftFilters.value = [...newFilters];
    rightFilters.value = [...newFilters];
  } else {
    // When in individual mode, update only the active channel
    if (activeChannel.value === 'left') {
      leftFilters.value = newFilters;
    } else {
      rightFilters.value = newFilters;
    }
  }
};

const addFilterToCurrentChannel = async (filter: Filter) => {
  if (channelMode.value === 'both') {
    // When in both mode, add to both channels with the same ID
    leftFilters.value.push({ ...filter });
    rightFilters.value.push({ ...filter }); // Same ID for both channels

    // Add to filter store for both channels
    const storeFilter = convertUIFilterToStore(filter);
    await filterStore.addFilter('left', leftFilters.value.length - 1, storeFilter);
    await filterStore.addFilter('right', rightFilters.value.length - 1, storeFilter);
  } else {
    // When in individual mode, add only to the active channel
    if (activeChannel.value === 'left') {
      leftFilters.value.push(filter);
      await filterStore.addFilter('left', leftFilters.value.length - 1, convertUIFilterToStore(filter));
    } else {
      rightFilters.value.push(filter);
      await filterStore.addFilter('right', rightFilters.value.length - 1, convertUIFilterToStore(filter));
    }
  }
};

const removeFilterFromCurrentChannel = async (filterId: number) => {
  if (channelMode.value === 'both') {
    // When in both mode, remove from both channels
    const leftIndex = leftFilters.value.findIndex(f => f.id === filterId);
    const rightIndex = rightFilters.value.findIndex(f => f.id === filterId);
    if (leftIndex !== -1) {
      leftFilters.value.splice(leftIndex, 1);
      await filterStore.removeFilter('left', leftIndex);
    }
    if (rightIndex !== -1) {
      rightFilters.value.splice(rightIndex, 1);
      await filterStore.removeFilter('right', rightIndex);
    }
  } else {
    // When in individual mode, remove only from the active channel
    const currentFilters = getCurrentFilterArray();
    const indexToRemove = currentFilters.findIndex(f => f.id === filterId);
    if (indexToRemove !== -1) {
      if (activeChannel.value === 'left') {
        leftFilters.value.splice(indexToRemove, 1);
        await filterStore.removeFilter('left', indexToRemove);
      } else {
        rightFilters.value.splice(indexToRemove, 1);
        await filterStore.removeFilter('right', indexToRemove);
      }
    }
  }
};

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

const freqGridLabels = computed(() => {
  return generateFrequencyLabels();
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

  // Update activeFilterId to match the first filter in the new channel, if any
  const currentFilters = channel === 'left' ? leftFilters.value : rightFilters.value;
  if (currentFilters.length > 0) {
    activeFilterId.value = currentFilters[0].id;
  } else {
    activeFilterId.value = null;
  }
}

function toggleChannelMode() {
  const previousMode = channelMode.value;
  channelMode.value = channelMode.value === 'individual' ? 'both' : 'individual';

  // When switching to 'both' mode, copy filters from the currently active channel to the other channel
  if (previousMode === 'individual' && channelMode.value === 'both') {
    const sourceFilters = activeChannel.value === 'left' ? leftFilters.value : rightFilters.value;
    const targetFilters = activeChannel.value === 'left' ? rightFilters : leftFilters;

    // Create deep copies with new IDs to avoid conflicts
    const copiedFilters = sourceFilters.map((filter, index) => ({
      ...filter,
      id: Date.now() + index + 1000 // Ensure unique IDs
    }));

    targetFilters.value = copiedFilters;
  }
}

// Bypass functionality - temporarily disable all filters while pressed
function startBypass() {
  if (isBypassed.value || isDragging.value || isDraggingBandwidth.value) return; // Already bypassed or dragging

  isBypassed.value = true;

  // Store current filter states for both channels
  previousFilterStates.value.clear();

  leftFilters.value.forEach(filter => {
    previousFilterStates.value.set(`left-${filter.id}`, filter.enabled);
    filter.enabled = false; // Disable all filters
  });

  rightFilters.value.forEach(filter => {
    previousFilterStates.value.set(`right-${filter.id}`, filter.enabled);
    filter.enabled = false; // Disable all filters
  });
}

function endBypass() {
  if (!isBypassed.value) return; // Not bypassed

  isBypassed.value = false;

  // Restore previous filter states for both channels
  leftFilters.value.forEach(filter => {
    const previousState = previousFilterStates.value.get(`left-${filter.id}`);
    if (previousState !== undefined) {
      filter.enabled = previousState;
    }
  });

  rightFilters.value.forEach(filter => {
    const previousState = previousFilterStates.value.get(`right-${filter.id}`);
    if (previousState !== undefined) {
      filter.enabled = previousState;
    }
  });

  previousFilterStates.value.clear();
}

function setActiveFilter(id: number) {
  activeFilterId.value = id;
}

const addFilterOfType = async (type: BiquadFilterType) => {
  try {
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

    // For generic normalized filters, add default coefficients
    if (type === 'generic_normalized') {
      newFilter.genericCoeffs = {
        b0: 1.0,
        b1: 0.0,
        b2: 0.0,
        a1: 0.0,
        a2: 0.0
      };
    }

    await addFilterToCurrentChannel(newFilter);
    setActiveFilter(newId); // Make the newly added filter active

    // Reload capabilities to update the UI filter counts
    await loadBackendCapabilities();

    showAddFilterModal.value = false;
  } catch (error) {
    console.error('Failed to add filter:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    alert(`Failed to add filter: ${errorMessage}`);
  }
};

const removeFilter = async (filterId: number) => {
  await removeFilterFromCurrentChannel(filterId);

  // If we removed the active filter, set active to first available filter or null
  if (activeFilterId.value === filterId) {
    const currentFilters = getCurrentFilterArray();
    activeFilterId.value = currentFilters[0]?.id || null;
  }

  // Reload capabilities to update the UI filter counts
  await loadBackendCapabilities();
};

// Load EQ settings from a JSON file
const loadEQSettings = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.filters && Array.isArray(data.filters)) {
            const loadedFilters = data.filters.map((filter: Filter, index: number) => ({
              ...filter,
              id: Date.now() + index // Ensure unique IDs
            }));

            // Load filters to current channel or both channels based on mode
            if (data.leftFilters && data.rightFilters) {
              // New format with separate channels
              leftFilters.value = data.leftFilters.map((filter: Filter, index: number) => ({
                ...filter,
                id: Date.now() + index
              }));
              rightFilters.value = data.rightFilters.map((filter: Filter, index: number) => ({
                ...filter,
                id: Date.now() + index + 1000
              }));

              // Update filter store with loaded filters
              await filterStore.clearFiltersFromBank('left');
              await filterStore.clearFiltersFromBank('right');

              for (const [index, filter] of leftFilters.value.entries()) {
                await filterStore.addFilter('left', index, convertUIFilterToStore(filter));
              }

              for (const [index, filter] of rightFilters.value.entries()) {
                await filterStore.addFilter('right', index, convertUIFilterToStore(filter));
              }
            } else {
              // Legacy format - load to current channel
              setCurrentFilterArray(loadedFilters);

              // Update filter store for current channel
              await filterStore.clearFiltersFromBank(activeChannel.value);
              for (const [index, filter] of loadedFilters.entries()) {
                await filterStore.addFilter(activeChannel.value, index, convertUIFilterToStore(filter));
              }
            }

            // Set the first filter as active if any exist
            const currentFilters = getCurrentFilterArray();
            if (currentFilters.length > 0) {
              activeFilterId.value = currentFilters[0].id;
            }

            // Restore other settings if available
            if (data.channelMode) channelMode.value = data.channelMode;
            if (data.activeChannel) activeChannel.value = data.activeChannel;
          }
        } catch (error) {
          console.error('Error loading Speaker EQ settings:', error);
          alert('Error loading Speaker EQ settings. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
};

// Save current EQ settings to a JSON file
const saveEQSettings = () => {
  const data = {
    filters: filters.value, // Keep for legacy compatibility
    leftFilters: leftFilters.value,
    rightFilters: rightFilters.value,
    channelMode: channelMode.value,
    activeChannel: activeChannel.value,
    timestamp: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${EQ_FILE_PREFIX}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

// Helper function to apply changes to multiple channels based on current mode
// Supports future expansion beyond left/right to A,B,C,D,E,F,G,H or C1,C2,C3,C4 etc.
const applyFilterChangeToMultipleChannels = async (filterId: number, updateFn: (filter: Filter) => void, targetChannels?: string[]) => {
  // Determine which channels to update
  let channelsToUpdate: string[] = [];

  if (targetChannels) {
    // Use explicitly provided channels
    channelsToUpdate = targetChannels;
  } else if (channelMode.value === 'both') {
    // Apply to both left and right channels
    channelsToUpdate = ['left', 'right'];
  } else {
    // Apply to current channel only
    channelsToUpdate = [activeChannel.value];
  }

  // Apply updates to each specified channel
  for (const channelName of channelsToUpdate) {
    let filters: Filter[] = [];

    // Get the filter array for this channel (expandable for future channels)
    switch (channelName) {
      case 'left':
        filters = leftFilters.value;
        break;
      case 'right':
        filters = rightFilters.value;
        break;
      // Future channels can be added here:
      // case 'A': case 'B': case 'C': case 'D':
      // case 'E': case 'F': case 'G': case 'H':
      //   filters = getChannelFilters(channelName); break;
      // case 'C1': case 'C2': case 'C3': case 'C4':
      //   filters = getNumericChannelFilters(channelName); break;
      default:
        console.warn(`[Filter Store] Unknown channel: ${channelName}`);
        continue;
    }

    const filter = filters.find(f => f.id === filterId);
    if (filter) {
      updateFn(filter);
      // Update filter store for this channel
      const filterIndex = filters.findIndex(f => f.id === filterId);
      if (filterIndex !== -1) {
        await filterStore.updateFilter(channelName, filterIndex, convertUIFilterToStore(filter));
      }
    }
  }
};

function incrementFilterFrequency(filter: Filter) {
  const updateFn = (f: Filter) => {
    // Calculate logarithmic step size based on CONFIG_STEPS_PER_OCTAVE
    const logStep = Math.log2(2) / CONFIG_STEPS_PER_OCTAVE; // Each step is 1/10th of an octave
    const currentLog = Math.log2(f.frequency);
    const newLog = currentLog + logStep;
    const newFreq = Math.pow(2, newLog);

    f.frequency = Math.min(DEFAULT_FREQ_RANGE.max, Math.round(newFreq));
  };

  applyFilterChangeToMultipleChannels(filter.id, updateFn);
}

function decrementFilterFrequency(filter: Filter) {
  const updateFn = (f: Filter) => {
    // Calculate logarithmic step size based on CONFIG_STEPS_PER_OCTAVE
    const logStep = Math.log2(2) / CONFIG_STEPS_PER_OCTAVE; // Each step is 1/10th of an octave
    const currentLog = Math.log2(f.frequency);
    const newLog = currentLog - logStep;
    const newFreq = Math.pow(2, newLog);

    f.frequency = Math.max(DEFAULT_FREQ_RANGE.min, Math.round(newFreq));
  };

  applyFilterChangeToMultipleChannels(filter.id, updateFn);
}

function incrementFilterGain(filter: Filter) {
  const updateFn = (f: Filter) => {
    f.gain = Math.min(DEFAULT_GAIN_RANGE.max, f.gain + 0.5);
  };

  applyFilterChangeToMultipleChannels(filter.id, updateFn);
}

function decrementFilterGain(filter: Filter) {
  const updateFn = (f: Filter) => {
    f.gain = Math.max(DEFAULT_GAIN_RANGE.min, f.gain - 0.5);
  };

  applyFilterChangeToMultipleChannels(filter.id, updateFn);
}

function widenFilterBand(filter: Filter) {
  const updateFn = (f: Filter) => {
    if (typeof f.Q === 'number') {
      // Widening the band means DECREASING the Q value using logarithmic scaling
      f.Q = Math.max(0.1, f.Q / CONFIG_Q_STEP_FACTOR);
    }
  };

  applyFilterChangeToMultipleChannels(filter.id, updateFn);
}

function narrowFilterBand(filter: Filter) {
  const updateFn = (f: Filter) => {
    if (typeof f.Q === 'number') {
      // Narrowing the band means INCREASING the Q value using logarithmic scaling
      f.Q = Math.min(25.0, f.Q * CONFIG_Q_STEP_FACTOR);
    }
  };

  applyFilterChangeToMultipleChannels(filter.id, updateFn);
}

function updateGenericCoeff(filter: Filter, coeffName: string, event: Event) {
  const target = event.target as HTMLInputElement;
  const value = parseFloat(target.value);

  // Validate that the value is a real number
  if (isNaN(value)) {
    return;
  }

  const updateFn = (f: Filter) => {
    // Initialize genericCoeffs if it doesn't exist
    if (!f.genericCoeffs) {
      f.genericCoeffs = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 };
    }

    // Update the specific coefficient
    switch (coeffName) {
      case 'b0': f.genericCoeffs.b0 = value; break;
      case 'b1': f.genericCoeffs.b1 = value; break;
      case 'b2': f.genericCoeffs.b2 = value; break;
      case 'a1': f.genericCoeffs.a1 = value; break;
      case 'a2': f.genericCoeffs.a2 = value; break;
    }
  };

  applyFilterChangeToMultipleChannels(filter.id, updateFn);
}

function toggleFilterEnabled(filter: Filter) {
  const updateFn = (f: Filter) => {
    f.enabled = !f.enabled;
  };

  applyFilterChangeToMultipleChannels(filter.id, updateFn);
}

const startDrag = (e: MouseEvent, band: Filter) => {
  e.preventDefault();
  e.stopPropagation();

  selectedBand.value = band;
  isDragging.value = true;
  setActiveFilter(band.id);

  if (svgElement.value) {
    svgElement.value.style.cursor = 'grabbing';
  }

  // Add global event listeners for more reliable dragging
  document.addEventListener('mousemove', handleGlobalMouseMove);
  document.addEventListener('mouseup', handleGlobalMouseUp);

  // Prevent text selection during drag
  document.body.style.userSelect = 'none';
};

const startBandwidthDrag = (e: MouseEvent, side: 'start' | 'end') => {
  e.preventDefault();
  e.stopPropagation();

  const activeFilter = filters.value.find(f => f.id === activeFilterId.value);
  if (!activeFilter) return;

  isDraggingBandwidth.value = true;
  bandwidthDragSide.value = side;
  draggingFilter.value = activeFilter;

  if (svgElement.value) {
    svgElement.value.style.cursor = 'ew-resize';
  }

  // Add global event listeners for more reliable dragging
  document.addEventListener('mousemove', handleGlobalMouseMove);
  document.addEventListener('mouseup', handleGlobalMouseUp);

  // Prevent text selection during drag
  document.body.style.userSelect = 'none';
};

const handleMouseMove = (e: MouseEvent) => {
  if (!svgElement.value) return;

  const rect = svgElement.value.getBoundingClientRect();
  const xInPlot = e.clientX - rect.left - margin.left;
  const yInPlot = e.clientY - rect.top - margin.top;

  if (isDraggingBandwidth.value && draggingFilter.value && bandwidthDragSide.value) {
    // Handle bandwidth line dragging
    const clampedX = Math.max(0, Math.min(plotWidth.value, xInPlot));
    const newFreq = xToFrequencyLocal(clampedX);

    const filter = draggingFilter.value;
    const centerFreq = filter.frequency;

    // Calculate the new bandwidth based on the dragged frequency
    let newBandwidthOctaves: number;

    if (bandwidthDragSide.value === 'start') {
      // Dragging the lower frequency line
      const upperFreq = activeFilterBandwidthEnd.value || centerFreq * Math.sqrt(2);
      newBandwidthOctaves = Math.log2(upperFreq / Math.max(newFreq, 1));
    } else {
      // Dragging the upper frequency line
      const lowerFreq = activeFilterBandwidthStart.value || centerFreq / Math.sqrt(2);
      newBandwidthOctaves = Math.log2(Math.max(newFreq, 1) / lowerFreq);
    }

    // Clamp bandwidth to reasonable values
    newBandwidthOctaves = Math.max(0.1, Math.min(10, newBandwidthOctaves));

    // Convert bandwidth to Q using the Audio EQ Cookbook formula
    const omega0 = 2 * Math.PI * centerFreq / SAMPLE_RATE;
    const newQ = bandwidthToQ(newBandwidthOctaves, omega0);

    // Clamp Q to reasonable values
    const clampedQ = Math.max(0.1, Math.min(25.0, newQ));

    // Apply Q change to both channels if in 'both' mode
    if (channelMode.value === 'both') {
      const leftFilter = leftFilters.value.find(f => f.id === filter.id);
      const rightFilter = rightFilters.value.find(f => f.id === filter.id);
      if (leftFilter) leftFilter.Q = clampedQ;
      if (rightFilter) rightFilter.Q = clampedQ;
    } else {
      filter.Q = clampedQ;
    }

  } else if (isDragging.value && selectedBand.value) {
    // Handle filter point dragging (existing functionality)
    const clampedX = Math.max(0, Math.min(plotWidth.value, xInPlot));
    const clampedY = Math.max(0, Math.min(plotHeight.value, yInPlot));

    const newFreq = Math.round(xToFrequencyLocal(clampedX) / 10) * 10;
    const newGain = Math.max(DEFAULT_GAIN_RANGE.min, Math.min(DEFAULT_GAIN_RANGE.max, Math.round(yToGainLocal(clampedY))));

    // Apply frequency and gain changes to both channels if in 'both' mode
    if (channelMode.value === 'both') {
      const leftFilter = leftFilters.value.find(f => f.id === selectedBand.value!.id);
      const rightFilter = rightFilters.value.find(f => f.id === selectedBand.value!.id);
      if (leftFilter) {
        leftFilter.frequency = newFreq;
        leftFilter.gain = newGain;
      }
      if (rightFilter) {
        rightFilter.frequency = newFreq;
        rightFilter.gain = newGain;
      }
    } else {
      selectedBand.value.frequency = newFreq;
      selectedBand.value.gain = newGain;
    }
  } else {
    // Update cursor based on mouse position when not dragging
    updateCursor(xInPlot, yInPlot);
  }
};

// Function to update cursor based on mouse position
const updateCursor = (xInPlot: number, yInPlot: number) => {
  if (!svgElement.value) return;

  const BANDWIDTH_LINE_TOLERANCE = 16; // pixels - increased to match hit area
  const FILTER_NODE_TOLERANCE = 12; // pixels

  let newCursor = 'default';

  // Check if we're near any filter nodes first (highest priority)
  for (const filter of filters.value) {
    const filterX = frequencyToXLocal(filter.frequency);
    const filterY = gainToYLocal(filter.gain);

    const distanceToNode = Math.sqrt(
      Math.pow(xInPlot - filterX, 2) + Math.pow(yInPlot - filterY, 2)
    );

    if (distanceToNode <= FILTER_NODE_TOLERANCE) {
      newCursor = 'grab';
      break;
    }
  }

  // If not near a filter node, check if we're near bandwidth lines
  if (newCursor === 'default' && SHOW_BANDWIDTH_LINES &&
      activeFilterBandwidthStart.value !== null && activeFilterBandwidthEnd.value !== null) {

    const startLineX = frequencyToXLocal(activeFilterBandwidthStart.value);
    const endLineX = frequencyToXLocal(activeFilterBandwidthEnd.value);

    // Check if mouse is near the start bandwidth line
    if (Math.abs(xInPlot - startLineX) <= BANDWIDTH_LINE_TOLERANCE) {
      newCursor = 'ew-resize';
    }
    // Check if mouse is near the end bandwidth line
    else if (Math.abs(xInPlot - endLineX) <= BANDWIDTH_LINE_TOLERANCE) {
      newCursor = 'ew-resize';
    }
  }

  svgElement.value.style.cursor = newCursor;
};

const handleMouseUp = () => {
  // If we were dragging a filter, update the store with the final values
  if (isDragging.value && selectedBand.value) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    applyFilterChangeToMultipleChannels(selectedBand.value.id, (filter: Filter) => {
      // The filter has already been updated in handleMouseMove,
      // this just triggers the store update with current values
      // No additional changes needed here, just trigger store sync
    });
  }

  // If we were dragging bandwidth, update the store with the final Q value
  if (isDraggingBandwidth.value && draggingFilter.value) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    applyFilterChangeToMultipleChannels(draggingFilter.value.id, (filter: Filter) => {
      // The filter Q has already been updated in handleMouseMove,
      // this just triggers the store update with current values
      // No additional changes needed here, just trigger store sync
    });
  }

  isDragging.value = false;
  selectedBand.value = null;

  // Reset bandwidth dragging state
  isDraggingBandwidth.value = false;
  bandwidthDragSide.value = null;
  draggingFilter.value = null;

  // Reset cursor to default - it will be updated on next mouse move
  if (svgElement.value) {
    svgElement.value.style.cursor = 'default';
  }
};

// Global mouse event handlers for more reliable dragging
const handleGlobalMouseMove = (e: MouseEvent) => {
  if (!isDragging.value && !isDraggingBandwidth.value) return;
  handleMouseMove(e);
};

const handleGlobalMouseUp = () => {
  if (isDragging.value || isDraggingBandwidth.value) {
    handleMouseUp();

    // Remove global event listeners
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleGlobalMouseUp);

    // Restore text selection
    document.body.style.userSelect = '';
  }
};

const formatHzForSVG = (val: number) => {
  if (val >= 1000) {
    return `${val / 1000} kHz`;
  }
  return `${val} Hz`;
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
  if (e.key === 'Escape') {
    if (showAddFilterModal.value) {
      showAddFilterModal.value = false;
    } else if (showBackendInfoModal.value) {
      showBackendInfoModal.value = false;
    }
  }

  // Spacebar for bypass (common in audio software)
  if (e.code === 'Space' && !showAddFilterModal.value && !showBackendInfoModal.value) {
    e.preventDefault(); // Prevent page scroll
    startBypass();
  }
};

const handleKeyup = (e: KeyboardEvent) => {
  // Release spacebar to end bypass
  if (e.code === 'Space' && !showAddFilterModal.value && !showBackendInfoModal.value) {
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

  // Clean up global mouse event listeners
  document.removeEventListener('mousemove', handleGlobalMouseMove);
  document.removeEventListener('mouseup', handleGlobalMouseUp);

  // Restore text selection
  document.body.style.userSelect = '';
});

// Watch both filter arrays for changes
watch([leftFilters, rightFilters], () => {
  leftFilters.value.forEach((f) => {
    f.text = `${f.frequency}`;
  });
  rightFilters.value.forEach((f) => {
    f.text = `${f.frequency}`;
  });
}, { deep: true });

// Watch for active channel changes to reload capabilities
watch(activeChannel, async () => {
  await loadBackendCapabilities();
});
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

    .title-section {
      display: flex;
      flex-direction: column;
      gap: 5px;

      h1 {
        margin: 0;
        font-family: 'Metropolis', sans-serif;
        font-weight: 500;
        font-size: 28px;
        line-height: 1.2;
      }

      .backend-info {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #aaa;

        .backend-name {
          font-weight: 500;
          cursor: pointer;
          color: #00b8ff;
          text-decoration: underline;
          transition: color 0.2s ease;

          &:hover {
            color: #0096cc;
          }
        }

        .filter-limits {
          color: #00b8ff;
          font-weight: 500;
        }
      }
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

      .icon-btn {
        cursor: pointer;
        width: 24px;
        height: 24px;
        filter: invert(44%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(0%) contrast(1);
        transition: filter 0.2s ease;

        &:hover {
          filter: invert(23%) sepia(89%) saturate(1352%) hue-rotate(340deg) brightness(99%) contrast(80%);
        }

        &.bypassed {
          filter: invert(48%) sepia(79%) saturate(2476%) hue-rotate(186deg) brightness(118%) contrast(119%) drop-shadow(0 0 4px rgba(0, 184, 255, 0.5));
        }

        &.linked {
          filter: invert(23%) sepia(89%) saturate(1352%) hue-rotate(340deg) brightness(99%) contrast(80%);
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
    user-select: none; /* Prevent text selection */
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;

    svg {
      width: 100%;
      // **MODIFICATION 3: Removed or commented out height: 100%;**
      /* height: 100%; */
      // The height attribute bound via Vue (:height="svgHeight") will now control the height.
      overflow: visible;
      user-select: none; /* Prevent text selection in SVG */

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

          &:hover:not(.disabled) {
            border-color: #e11e4a;
            background: rgba(225, 30, 74, 0.05);
          }

          &.disabled {
            cursor: not-allowed;
            opacity: 0.5;
            border-color: #555;
            color: #777;

            .filter-icon {
              opacity: 0.5;
            }

            &:hover {
              border-color: #555;
              background: rgba(255, 255, 255, 0.02);
            }
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
          display: block;

          .standard-controls {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }

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

        .generic-coefficients {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;

          .coefficient-inputs {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 16px;
            width: 100%;

            .coefficient-group {
              display: flex;
              flex-direction: column;
              align-items: stretch;
              gap: 8px;

              label {
                font-size: 12px;
                color: #666;
                font-weight: 600;
                text-transform: uppercase;
                text-align: center;
                letter-spacing: 0.5px;
              }

              input {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid rgba(112, 112, 112, 0.5);
                border-radius: 6px;
                background: rgba(255, 255, 255, 0.95);
                color: #333;
                font-size: 13px;
                font-weight: 500;
                text-align: center;
                transition: all 0.2s ease;
                font-family: 'Monaco', 'Menlo', 'Consolas', monospace;

                &:focus {
                  outline: none;
                  border-color: #e11e4a;
                  background: white;
                  box-shadow: 0 0 0 2px rgba(225, 30, 74, 0.1);
                }

                &:hover {
                  border-color: rgba(225, 30, 74, 0.7);
                  background: white;
                }

                &::placeholder {
                  color: #999;
                  font-style: italic;
                }
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
  width: max-content;
  min-width: 400px;
  max-width: 90vw;
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
    flex-wrap: wrap;
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

.backend-info-modal {
  width: 600px !important;
  max-width: 90% !important;
  text-align: left !important;

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #333;

    h2 {
      margin: 0;
      color: black;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      font-weight: bold;
      color: #666;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;

      &:hover {
        background-color: #f0f0f0;
        color: #000;
      }
    }
  }

  .modal-body {
    color: #333;
    line-height: 1.6;

    h4 {
      color: #e11e4a;
      font-size: 16px;
      margin-top: 20px;
      margin-bottom: 10px;
      font-weight: 600;
    }

    ul {
      margin: 10px 0;
      padding-left: 20px;

      li {
        margin-bottom: 8px;
      }
    }

    code {
      background-color: #f5f5f5;
      color: #d63384;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
    }

    strong {
      color: #000;
    }

    em {
      color: #666;
      font-style: italic;
    }

    p:first-child strong {
      color: #e11e4a;
      font-size: 18px;
    }
  }
}
</style>
