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
          <img src="/images/svg/tabler/armchair.svg" @click="loadRoomEQSettings" title="Load Room EQ Configuration" class="icon-btn" />
          <img src="/images/svg/folder_open.svg" @click="loadEQSettings" title="Load EQ Settings" class="icon-btn" />
          <img src="/images/svg/save.svg" @click="saveEQSettings" title="Save EQ Settings" class="icon-btn" />
        </div>
      </div>
      <div class="card">
        <div class="graph">
          <FilterGraph
            :filters="filters"
            :active-filter-id="activeFilterId"
            :show-bandwidth-lines="true"
            :sample-rate="SAMPLE_RATE"
            @set-active-filter="setActiveFilter"
            @update:freq-gain="onGraphUpdateFreqGain"
            @update:q="onGraphUpdateQ"
            @drag-start="onGraphDragStart"
            @drag-end="onGraphDragEnd"
          />
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

      <!-- Room EQ Loader Modal -->
      <div v-if="showRoomEQModal" class="modal-backdrop" @click.self="showRoomEQModal = false">
        <div class="modal-content room-eq-modal">
          <div class="modal-header">
            <h2>Load Room EQ Configuration</h2>
            <button class="close-btn" @click="showRoomEQModal = false">×</button>
          </div>
          <div class="modal-body">
            <div v-if="loadingRoomEQConfigs" class="loading-message">
              Loading configurations...
            </div>
            <div v-else-if="roomEQConfigs.length === 0" class="no-configs-message">
              No Room EQ configurations found. Create one using the Room Equalisation Wizard first.
            </div>
            <div v-else>
              <div class="config-selection">
                <h4>Select Configuration:</h4>
                <div class="config-list">
                  <div
                    v-for="config in roomEQConfigs"
                    :key="config.key"
                    :class="['config-item', { selected: selectedRoomEQConfig === config }]"
                    @click="selectedRoomEQConfig = config"
                  >
                    <div class="config-name">{{ config.data.name }}</div>
                    <div class="config-details">
                      {{ config.data.filters.length }} filters •
                      {{ new Date(config.data.created_at).toLocaleDateString() }}
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="selectedRoomEQConfig" class="channel-selection">
                <h4>Apply to Channels:</h4>
                <div class="channel-options">
                  <label class="channel-option">
                    <input type="radio" v-model="roomEQChannelMode" value="left" />
                    <span>Left Channel Only</span>
                  </label>
                  <label class="channel-option">
                    <input type="radio" v-model="roomEQChannelMode" value="right" />
                    <span>Right Channel Only</span>
                  </label>
                  <label class="channel-option">
                    <input type="radio" v-model="roomEQChannelMode" value="both" />
                    <span>Both Channels</span>
                  </label>
                </div>
              </div>

              <div class="modal-actions">
                <button @click="showRoomEQModal = false" class="btn secondary">Cancel</button>
                <button
                  @click="loadSelectedRoomEQConfig"
                  :disabled="!selectedRoomEQConfig"
                  class="btn primary"
                >
                  Load Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import AppIcon from '@/components/app-icon.vue';
import FilterGraph from '@/components/filter-graph.vue';
import { useFilterStore, type BackendCapabilities } from '@/stores/filter_connector';
import { type Filter } from '@/utils/filtercalc';

import {
  type BiquadFilterType,

} from '@/utils/biquad';
import { getFilterIconName, formatFilterTypeName } from '@/utils/filter-display';

import {
  setFilterBankBypassState,
  type FilterBypassSetResponse
} from '@/api/dsptoolkit';

import { getConfigKeys, getConfigValue } from '@/api/config';

import {
  type LinkedChannelConfig,
  type ChannelMode as LinkedChannelMode,
  addFilterToLinkedChannels,
  removeFilterFromLinkedChannels,
  toggleFilterEnabledLinked,
  copyFiltersToChannels,
  updateFilterPropertyLinked,
  updateGenericCoeffLinked
} from '@/utils/linked-channel-operations';

import { DEFAULT_FREQ_RANGE, DEFAULT_GAIN_RANGE } from '@/utils/filtergraph';

import { convertUIFilterToStore, convertStoreFilterToUI } from '@/utils/filter-conversions';

// Constants
const SAMPLE_RATE = 48000; // Default sample rate for biquad calculations
const CONFIG_STEPS_PER_OCTAVE = 10; // Number of frequency steps per octave for logarithmic scaling
const CONFIG_Q_STEP_FACTOR = 1.07; // Logarithmic step factor for Q value changes
const EQ_FILE_PREFIX = 'speaker-eq'; // File prefix for save/load functionality
// const SHOW_BANDWIDTH_LINES = true; // handled inside FilterGraph

// Available filter types for the UI
const AVAILABLE_FILTER_TYPES: BiquadFilterType[] = ['lowshelf', 'peaking', 'highshelf', 'generic_normalized'];


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

// Load existing filters from the backend
const loadFiltersFromBackend = async () => {
  try {
    // Sync from backend to get the current filter configuration
    await filterStore.syncFromBackend();

    // Convert backend filters to UI format
    const backendFilters = filterStore.filterBanks;

    // Update left channel filters
    if (backendFilters.left?.filters) {
      leftFilters.value = backendFilters.left.filters.map((filter, index) => convertStoreFilterToUI(filter, `left_${index + 1}`));
    }

    // Update right channel filters
    if (backendFilters.right?.filters) {
      rightFilters.value = backendFilters.right.filters.map((filter, index) => convertStoreFilterToUI(filter, `right_${index + 1}`));
    }

    console.log('Loaded filters from backend:', { leftCount: leftFilters.value.length, rightCount: rightFilters.value.length });
  } catch (error) {
    console.error('Failed to load filters from backend:', error);
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


// Initialize filter banks in the store
onMounted(async () => {
  const route = useRoute();

  // Initialize backend from settingsDB first
  await filterStore.initializeBackend();

  // Load backend capabilities first
  await loadBackendCapabilities();

  // Create both current and prepare for future channel expansion
  const currentChannels = ['left', 'right'];
  await filterStore.createMultipleFilterBanks(currentChannels);

  // Load existing filters from the backend
  await loadFiltersFromBackend();

  // Reload capabilities after loading filters to get updated counts
  await loadBackendCapabilities();

  // Check for Room EQ query parameters
  if (route.query.applyRoomEQ && route.query.channel) {
    await loadRoomEQSettings();
    const roomEQKey = route.query.applyRoomEQ as string;
    const channel = route.query.channel as 'left' | 'right' | 'both';

    // Find and select the Room EQ configuration
    const config = roomEQConfigs.value.find(config => config.key === roomEQKey);
    if (config) {
      selectedRoomEQConfig.value = config;
      roomEQChannelMode.value = channel;
      // Automatically apply the Room EQ configuration
      await loadSelectedRoomEQConfig();
    }
  }
});

const activeChannel = ref<Channel>('left');
const channelMode = ref<ChannelMode>('individual');

// Separate filter banks for left and right channels
const leftFilters = ref<Filter[]>([]);
const rightFilters = ref<Filter[]>([]);

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

// Room EQ Configuration Types
interface RoomEQConfig {
  name: string;
  filters: Array<{
    filter_type: string;
    frequency: number;
    gain_db: number;
    q: number;
    description?: string;
  }>;
  created_at: string;
}

interface RoomEQConfigItem {
  key: string;
  data: RoomEQConfig;
}

// Room EQ loader modal state
const showRoomEQModal = ref(false);
const loadingRoomEQConfigs = ref(false);
const roomEQConfigs = ref<RoomEQConfigItem[]>([]);
const selectedRoomEQConfig = ref<RoomEQConfigItem | null>(null);
const roomEQChannelMode = ref<'left' | 'right' | 'both'>('both');

// Bypass functionality state
const isBypassed = ref(false);
const previousFilterStates = ref<Map<string, boolean>>(new Map());

const activeFilterId = ref<number | null>(leftFilters.value[0]?.id || null);

const isDragging = ref(false);

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

// Create configuration for linked channel operations
const createLinkedChannelConfig = (): LinkedChannelConfig => {
  return {
    channelMode: channelMode.value as LinkedChannelMode,
    activeChannel: activeChannel.value,
    channelArrays: {
      left: leftFilters.value,
      right: rightFilters.value
    },
    bankAddresses: {
      left: 'customFilterRegisterBankLeft',
      right: 'customFilterRegisterBankRight'
    },
    updateStoreCallback: async (channelName: string, filterIndex: number, filter: Filter) => {
      await filterStore.updateFilter(channelName, filterIndex, convertUIFilterToStore(filter));
    },
    addStoreCallback: async (channelName: string, filterIndex: number, filter: Filter) => {
      await filterStore.addFilter(channelName, filterIndex, convertUIFilterToStore(filter));
    },
    removeStoreCallback: async (channelName: string, filterIndex: number) => {
      await filterStore.removeFilter(channelName, filterIndex);
    },
    clearStoreCallback: async (channelName: string) => {
      await filterStore.clearFiltersFromBank(channelName);
    }
  };
};

const addFilterToCurrentChannel = async (filter: Filter) => {
  const config = createLinkedChannelConfig();
  await addFilterToLinkedChannels(config, filter);
};

const removeFilterFromCurrentChannel = async (filterId: number) => {
  const config = createLinkedChannelConfig();
  await removeFilterFromLinkedChannels(config, filterId);
};

// Graph handlers from reusable FilterGraph
const onGraphUpdateFreqGain = ({ id, frequency, gain }: { id: number, frequency: number, gain: number }) => {
  if (channelMode.value === 'both') {
    const lf = leftFilters.value.find(f => f.id === id)
    const rf = rightFilters.value.find(f => f.id === id)
    if (lf) { lf.frequency = frequency; lf.gain = gain }
    if (rf) { rf.frequency = frequency; rf.gain = gain }
  } else {
    const f = getCurrentFilterArray().find(f => f.id === id)
    if (f) { f.frequency = frequency; f.gain = gain }
  }
}

const onGraphUpdateQ = ({ id, Q }: { id: number, Q: number }) => {
  if (channelMode.value === 'both') {
    const lf = leftFilters.value.find(f => f.id === id)
    const rf = rightFilters.value.find(f => f.id === id)
    if (lf && typeof lf.Q === 'number') lf.Q = Q
    if (rf && typeof rf.Q === 'number') rf.Q = Q
  } else {
    const f = getCurrentFilterArray().find(f => f.id === id)
    if (f && typeof f.Q === 'number') f.Q = Q
  }
}

const onGraphDragStart = () => {
  isDragging.value = true
}

const onGraphDragEnd = async (id: number) => {
  const config = createLinkedChannelConfig();
  await updateFilterPropertyLinked(config, id, () => { /* persist current values */ })
  isDragging.value = false
}

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

async function toggleChannelMode() {
  const previousMode = channelMode.value;
  channelMode.value = channelMode.value === 'individual' ? 'both' : 'individual';

  // When switching to 'both' mode, copy filters from the currently active channel to the other channel
  if (previousMode === 'individual' && channelMode.value === 'both') {
    const sourceChannelName = activeChannel.value;
    const targetChannelName = activeChannel.value === 'left' ? 'right' : 'left';

    try {
      const config = createLinkedChannelConfig();
      await copyFiltersToChannels(config, sourceChannelName, [targetChannelName]);

      console.log(`Synced filters from ${sourceChannelName} to ${targetChannelName} channel when linking channels`);
    } catch (error) {
      console.error(`Failed to sync filters to ${targetChannelName} channel:`, error);
    }
  }
}

// Bypass functionality using REST API - bypass entire filter banks while pressed
async function startBypass() {
  if (isBypassed.value || isDragging.value) return;

  isBypassed.value = true;

  try {
    // Determine which filter banks to bypass based on channel mode
    const banksToBypass: string[] = [];

    if (channelMode.value === 'both') {
      // Bypass both left and right filter banks
      banksToBypass.push('customFilterRegisterBankLeft', 'customFilterRegisterBankRight');
    } else {
      // Bypass only the active channel's filter bank
      const bankName = activeChannel.value === 'left'
        ? 'customFilterRegisterBankLeft'
        : 'customFilterRegisterBankRight';
      banksToBypass.push(bankName);
    }

    // Store the previous bypass states (assuming all banks are currently enabled)
    previousFilterStates.value.clear();
    for (const bankName of banksToBypass) {
      previousFilterStates.value.set(bankName, false); // false = not previously bypassed
    }

    // Bypass all filter banks using the REST API
    const bypassPromises: Promise<FilterBypassSetResponse>[] = banksToBypass.map(bankName =>
      setFilterBankBypassState(bankName, true).catch((error: Error) => {
        console.error(`Failed to bypass filter bank ${bankName}:`, error);
        throw error;
      })
    );

    // Wait for all bypass operations to complete
    const results = await Promise.all(bypassPromises);

    let totalFilters = 0;
    let successfulOperations = 0;
    results.forEach(result => {
      totalFilters += result.total_filters || 0;
      successfulOperations += result.successful || 0;
    });

    console.log(`Successfully bypassed ${successfulOperations}/${totalFilters} filters across ${banksToBypass.length} banks`);

  } catch (error) {
    console.error('Failed to start bypass:', error);
    // Reset bypass state if something went wrong
    isBypassed.value = false;
  }
}

async function endBypass() {
  if (!isBypassed.value) return;

  isBypassed.value = false;

  // If there were no filter banks to restore, just return
  if (previousFilterStates.value.size === 0) {
    console.log('No filter banks to restore from bypass');
    return;
  }

  try {
    // Restore all filter banks from bypass using the REST API
    const restorePromises: Promise<FilterBypassSetResponse>[] = [];

    for (const [bankName, wasPreviouslyBypassed] of previousFilterStates.value.entries()) {
      // Only restore banks that were not originally bypassed
      if (wasPreviouslyBypassed === false) {
        restorePromises.push(
          setFilterBankBypassState(bankName, false).catch((error: Error) => {
            console.error(`Failed to restore filter bank ${bankName}:`, error);
            throw error;
          })
        );
      }
    }

    // Wait for all restore operations to complete
    const results = await Promise.all(restorePromises);

    let totalFilters = 0;
    let successfulOperations = 0;
    results.forEach(result => {
      totalFilters += result.total_filters || 0;
      successfulOperations += result.successful || 0;
    });

    console.log(`Successfully restored ${successfulOperations}/${totalFilters} filters across ${restorePromises.length} banks`);

    // Clear the stored states
    previousFilterStates.value.clear();

  } catch (error) {
    console.error('Failed to end bypass:', error);
  }
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
              frequency: Math.round(filter.frequency), // Round frequency to full hertz
              id: Date.now() + index // Ensure unique IDs
            }));

            // Load filters to current channel or both channels based on mode
            if (data.leftFilters && data.rightFilters) {
              // New format with separate channels
              leftFilters.value = data.leftFilters.map((filter: Filter, index: number) => ({
                ...filter,
                frequency: Math.round(filter.frequency), // Round frequency to full hertz
                id: Date.now() + index
              }));
              rightFilters.value = data.rightFilters.map((filter: Filter, index: number) => ({
                ...filter,
                frequency: Math.round(filter.frequency), // Round frequency to full hertz
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

// Load Room EQ configurations from config API
const loadRoomEQSettings = async () => {
  showRoomEQModal.value = true;
  loadingRoomEQConfigs.value = true;
  roomEQConfigs.value = [];
  selectedRoomEQConfig.value = null;

  try {
    const configs: RoomEQConfigItem[] = [];

    // First get all config keys with the correction-filters prefix
    const keysResponse = await getConfigKeys('correction-filters.');

    if (keysResponse.status === 'success' && keysResponse.data && Array.isArray(keysResponse.data)) {
      // For each key, get the actual value
      for (const key of keysResponse.data) {
        if (key.startsWith('correction-filters.')) {
          try {
            const valueResponse = await getConfigValue(key);
            if (valueResponse.status === 'success' && valueResponse.data?.value) {
              const configData = JSON.parse(valueResponse.data.value) as RoomEQConfig;
              configs.push({ key, data: configData });
            }
          } catch (parseError) {
            console.warn(`Failed to parse Room EQ config ${key}:`, parseError);
          }
        }
      }
    }

    // Sort by creation date (newest first)
    configs.sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime());
    roomEQConfigs.value = configs;
  } catch (error) {
    // If we get a 404 or other error, it likely means no configurations exist yet
    if (error instanceof Error && error.message.includes('404')) {
      console.log('No Room EQ configurations found (404) - this is normal for a fresh installation');
      roomEQConfigs.value = [];
    } else {
      console.error('Failed to load Room EQ configurations:', error);
      roomEQConfigs.value = [];
    }
  } finally {
    loadingRoomEQConfigs.value = false;
  }
};

// Convert Room EQ filter to Speaker EQ filter format
const convertRoomEQFilterToSpeakerEQ = (roomEQFilter: RoomEQConfig['filters'][0], index: number): Filter => {
  // Map Room EQ filter types to Speaker EQ filter types
  const filterTypeMap: Record<string, BiquadFilterType> = {
    'hp': 'highpass',        // Room EQ uses 'hp'
    'lp': 'lowpass',         // Room EQ uses 'lp'
    'eq': 'peaking',         // Room EQ uses 'eq' for peaking/parametric EQ
    'peak': 'peaking',
    'peaking': 'peaking',
    'lowpass': 'lowpass',
    'highpass': 'highpass',
    'lowshelf': 'lowshelf',
    'highshelf': 'highshelf'
  };

  const filterType = filterTypeMap[roomEQFilter.filter_type] || 'peaking';

  return {
    id: Date.now() + index,
    icon: filterType,
    text: formatFilterTypeName(filterType),
    frequency: Math.round(roomEQFilter.frequency),
    gain: roomEQFilter.gain_db,
    Q: roomEQFilter.q,
    enabled: true
  };
};

// Load the selected Room EQ configuration
const loadSelectedRoomEQConfig = async () => {
  if (!selectedRoomEQConfig.value) return;

  try {
    const config = selectedRoomEQConfig.value.data;
    const convertedFilters = config.filters.map(convertRoomEQFilterToSpeakerEQ);

    // Clear existing filters first
    if (roomEQChannelMode.value === 'both' || roomEQChannelMode.value === 'left') {
      await filterStore.clearFiltersFromBank('left');
      leftFilters.value = [];
    }
    if (roomEQChannelMode.value === 'both' || roomEQChannelMode.value === 'right') {
      await filterStore.clearFiltersFromBank('right');
      rightFilters.value = [];
    }

    // Apply filters to selected channels
    if (roomEQChannelMode.value === 'both' || roomEQChannelMode.value === 'left') {
      leftFilters.value = [...convertedFilters];
      for (const [index, filter] of convertedFilters.entries()) {
        await filterStore.addFilter('left', index, convertUIFilterToStore(filter));
      }
    }
    if (roomEQChannelMode.value === 'both' || roomEQChannelMode.value === 'right') {
      rightFilters.value = [...convertedFilters];
      for (const [index, filter] of convertedFilters.entries()) {
        await filterStore.addFilter('right', index, convertUIFilterToStore(filter));
      }
    }

    // Set first filter as active
    if (convertedFilters.length > 0) {
      activeFilterId.value = convertedFilters[0].id;
    }

    showRoomEQModal.value = false;
    console.log(`✅ Loaded Room EQ configuration "${config.name}" to ${roomEQChannelMode.value} channel(s)`);
  } catch (error) {
    console.error('Failed to load Room EQ configuration:', error);
    alert('Error loading Room EQ configuration. Please try again.');
  }
};

// Helper function to apply changes to multiple channels based on current mode
// Supports future expansion beyond left/right to A,B,C,D,E,F,G,H or C1,C2,C3,C4 etc.
function incrementFilterFrequency(filter: Filter) {
  const config = createLinkedChannelConfig();
  updateFilterPropertyLinked(config, filter.id, (f: Filter) => {
    // Calculate logarithmic step size based on CONFIG_STEPS_PER_OCTAVE
    const logStep = Math.log2(2) / CONFIG_STEPS_PER_OCTAVE; // Each step is 1/10th of an octave
    const currentLog = Math.log2(f.frequency);
    const newLog = currentLog + logStep;
    const newFreq = Math.pow(2, newLog);

    f.frequency = Math.min(DEFAULT_FREQ_RANGE.max, Math.round(newFreq));
  });
}

function decrementFilterFrequency(filter: Filter) {
  const config = createLinkedChannelConfig();
  updateFilterPropertyLinked(config, filter.id, (f: Filter) => {
    // Calculate logarithmic step size based on CONFIG_STEPS_PER_OCTAVE
    const logStep = Math.log2(2) / CONFIG_STEPS_PER_OCTAVE; // Each step is 1/10th of an octave
    const currentLog = Math.log2(f.frequency);
    const newLog = currentLog - logStep;
    const newFreq = Math.pow(2, newLog);

    f.frequency = Math.max(DEFAULT_FREQ_RANGE.min, Math.round(newFreq));
  });
}

function incrementFilterGain(filter: Filter) {
  const config = createLinkedChannelConfig();
  updateFilterPropertyLinked(config, filter.id, (f: Filter) => {
    f.gain = Math.min(DEFAULT_GAIN_RANGE.max, f.gain + 0.5);
  });
}

function decrementFilterGain(filter: Filter) {
  const config = createLinkedChannelConfig();
  updateFilterPropertyLinked(config, filter.id, (f: Filter) => {
    f.gain = Math.max(DEFAULT_GAIN_RANGE.min, f.gain - 0.5);
  });
}

function widenFilterBand(filter: Filter) {
  const config = createLinkedChannelConfig();
  updateFilterPropertyLinked(config, filter.id, (f: Filter) => {
    if (typeof f.Q === 'number') {
      // Widening the band means DECREASING the Q value using logarithmic scaling
      f.Q = Math.max(0.1, f.Q / CONFIG_Q_STEP_FACTOR);
    }
  });
}

function narrowFilterBand(filter: Filter) {
  const config = createLinkedChannelConfig();
  updateFilterPropertyLinked(config, filter.id, (f: Filter) => {
    if (typeof f.Q === 'number') {
      // Narrowing the band means INCREASING the Q value using logarithmic scaling
      f.Q = Math.min(25.0, f.Q * CONFIG_Q_STEP_FACTOR);
    }
  });
}

function updateGenericCoeff(filter: Filter, coeffName: string, event: Event) {
  const target = event.target as HTMLInputElement;
  const value = parseFloat(target.value);

  // Validate that the value is a real number
  if (isNaN(value)) {
    return;
  }

  const config = createLinkedChannelConfig();
  updateGenericCoeffLinked(config, filter.id, coeffName, value);
}

async function toggleFilterEnabled(filter: Filter) {
  try {
    const config = createLinkedChannelConfig();
    await toggleFilterEnabledLinked(config, filter.id);
  } catch (error) {
    console.error('Failed to toggle filter enabled state:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    alert(`Failed to toggle filter: ${errorMessage}`);
  }
}

// Inline graph code removed in favor of FilterGraph component

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (showAddFilterModal.value) {
      showAddFilterModal.value = false;
    } else if (showBackendInfoModal.value) {
      showBackendInfoModal.value = false;
    } else if (showRoomEQModal.value) {
      showRoomEQModal.value = false;
    }
  }

  // Spacebar for bypass (common in audio software)
  if (e.code === 'Space' && !showAddFilterModal.value && !showBackendInfoModal.value && !showRoomEQModal.value) {
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
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('keyup', handleKeyup);
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
                color: #color-text;
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
                color: var(--color-text);
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
      min-width: 120px; // Set a minimum width to make boxes more compact
      max-width: 140px; // Set a maximum width

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
        white-space: pre-line; // Allow line breaks from \n characters
        text-align: center; // Center the multi-line text
        line-height: 1.2; // Tighter line spacing for compact appearance
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

// Room EQ Modal Styles
.room-eq-modal {
  min-width: 500px !important;
  max-width: 700px !important;

  .modal-body {
    text-align: left;
  }

  .loading-message, .no-configs-message {
    text-align: center;
    padding: 2rem;
    color: #666;
  }

  .config-selection {
    margin-bottom: 1.5rem;

    h4 {
      margin-bottom: 1rem;
      color: #333;
    }

    .config-list {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #ddd;
      border-radius: 8px;
    }

    .config-item {
      padding: 1rem;
      border-bottom: 1px solid #eee;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background-color: #f8f9fa;
      }

      &.selected {
        background-color: #e3f2fd;
        border-color: #2196f3;
      }

      &:last-child {
        border-bottom: none;
      }

      .config-name {
        font-weight: 600;
        color: #333;
        margin-bottom: 0.25rem;
      }

      .config-details {
        font-size: 0.875rem;
        color: #666;
      }
    }
  }

  .channel-selection {
    margin-bottom: 1.5rem;

    h4 {
      margin-bottom: 1rem;
      color: #333;
    }

    .channel-options {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .channel-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      color: #333;

      input[type="radio"] {
        margin: 0;
      }
    }
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s;

      &.secondary {
        background: #6c757d;
        color: white;

        &:hover {
          background: #5a6268;
        }
      }

      &.primary {
        background: #007bff;
        color: white;

        &:hover:not(:disabled) {
          background: #0056b3;
        }

        &:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
      }
    }
  }
}
</style>
