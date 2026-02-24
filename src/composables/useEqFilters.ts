/**
 * Composable for managing speaker EQ filter operations.
 * Handles filter CRUD, linked channel logic, and graph event callbacks.
 */

import { ref, computed, type Ref } from 'vue';
import { type Filter } from '@/utils/filtercalc';
import { type BiquadFilterType } from '@/utils/biquad';
import { useFilterStore, type BackendCapabilities } from '@/stores/filter_connector';
import { useToastStore } from '@/stores/toast';
import { convertUIFilterToStore, convertStoreFilterToUI } from '@/utils/filter-conversions';
import { DEFAULT_FREQ_RANGE, DEFAULT_GAIN_RANGE } from '@/utils/filtergraph';
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

// Constants
const SAMPLE_RATE = 48000;
const CONFIG_STEPS_PER_OCTAVE = 10;
const CONFIG_Q_STEP_FACTOR = 1.07;

type Channel = 'left' | 'right';
type ChannelMode = 'individual' | 'both';

export function useEqFilters() {
  const filterStore = useFilterStore();
  const toastStore = useToastStore();

  // State
  const activeChannel = ref<Channel>('left');
  const channelMode = ref<ChannelMode>('individual');
  const leftFilters = ref<Filter[]>([]);
  const rightFilters = ref<Filter[]>([]);
  const activeFilterId = ref<number | null>(null);
  const isDragging = ref(false);

  // Backend capabilities
  const backendCapabilities = ref<BackendCapabilities | null>(null);
  const backendName = ref('');

  // Computed
  const filters = computed(() => {
    return activeChannel.value === 'left' ? leftFilters.value : rightFilters.value;
  });

  const canAddFilterToCurrentChannel = computed(() => {
    if (!backendCapabilities.value) return false;
    const bankInfo = backendCapabilities.value.availableFilterBanks.find(
      bank => bank.name === activeChannel.value
    );
    if (!bankInfo) return false;
    return bankInfo.currentFilterCount < bankInfo.maxFilters;
  });

  const currentChannelFilterInfo = computed(() => {
    if (!backendCapabilities.value) return null;
    return backendCapabilities.value.availableFilterBanks.find(
      bank => bank.name === activeChannel.value
    ) ?? null;
  });

  // Linked channel config helper
  function createLinkedChannelConfig(): LinkedChannelConfig {
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
  }

  // Backend operations
  async function loadBackendCapabilities() {
    try {
      backendCapabilities.value = await filterStore.getBackendCapabilities();
      backendName.value = backendCapabilities.value?.backendName || '';
    } catch (error) {
      console.error('speaker-equalizer: Failed to load backend capabilities:', error);
    }
  }

  async function loadFiltersFromBackend() {
    try {
      await filterStore.syncFromBackend();
      const backendFilters = filterStore.filterBanks;

      if (backendFilters.left?.filters) {
        leftFilters.value = backendFilters.left.filters.map((filter, index) =>
          convertStoreFilterToUI(filter, `left_${index + 1}`)
        );
      }
      if (backendFilters.right?.filters) {
        rightFilters.value = backendFilters.right.filters.map((filter, index) =>
          convertStoreFilterToUI(filter, `right_${index + 1}`)
        );
      }
    } catch (error) {
      console.error('speaker-equalizer: Failed to load filters from backend:', error);
    }
  }

  async function initialize() {
    await filterStore.initializeBackend();
    await loadBackendCapabilities();
    await filterStore.createMultipleFilterBanks(['left', 'right']);
    await loadFiltersFromBackend();
    await loadBackendCapabilities();
  }

  // Channel operations
  function setActiveChannel(channel: Channel) {
    if (channelMode.value === 'both') {
      channelMode.value = 'individual';
    }
    activeChannel.value = channel;
    const currentFilters = channel === 'left' ? leftFilters.value : rightFilters.value;
    activeFilterId.value = currentFilters[0]?.id ?? null;
  }

  async function toggleChannelMode() {
    const previousMode = channelMode.value;
    channelMode.value = channelMode.value === 'individual' ? 'both' : 'individual';

    if (previousMode === 'individual' && channelMode.value === 'both') {
      const sourceChannelName = activeChannel.value;
      const targetChannelName = activeChannel.value === 'left' ? 'right' : 'left';

      try {
        const config = createLinkedChannelConfig();
        await copyFiltersToChannels(config, sourceChannelName, [targetChannelName]);
      } catch (error) {
        console.error(`speaker-equalizer: Failed to sync filters to ${targetChannelName} channel:`, error);
      }
    }
  }

  // Filter CRUD
  async function addFilterOfType(type: BiquadFilterType) {
    try {
      const newId = Date.now();
      const newFilter: Filter = {
        id: newId,
        icon: type,
        text: 'New',
        frequency: 1000,
        gain: 0,
        Q: 0.71,
        enabled: true,
      };

      if (type === 'generic_normalized') {
        newFilter.genericCoeffs = { b0: 1.0, b1: 0.0, b2: 0.0, a1: 0.0, a2: 0.0 };
      }

      const config = createLinkedChannelConfig();
      await addFilterToLinkedChannels(config, newFilter);
      activeFilterId.value = newId;
      await loadBackendCapabilities();
    } catch (error) {
      console.error('speaker-equalizer: Failed to add filter:', error);
      toastStore.showErrorToast('Failed to add filter.');
    }
  }

  async function removeFilter(filterId: number) {
    const config = createLinkedChannelConfig();
    await removeFilterFromLinkedChannels(config, filterId);

    if (activeFilterId.value === filterId) {
      activeFilterId.value = filters.value[0]?.id ?? null;
    }
    await loadBackendCapabilities();
  }

  async function toggleFilterEnabled(filter: Filter) {
    try {
      const config = createLinkedChannelConfig();
      await toggleFilterEnabledLinked(config, filter.id);
    } catch (error) {
      console.error('speaker-equalizer: Failed to toggle filter enabled state:', error);
      toastStore.showErrorToast('Failed to toggle filter.');
    }
  }

  // Filter parameter adjustments
  function incrementFilterFrequency(filter: Filter) {
    const config = createLinkedChannelConfig();
    updateFilterPropertyLinked(config, filter.id, (f: Filter) => {
      const logStep = Math.log2(2) / CONFIG_STEPS_PER_OCTAVE;
      const newFreq = Math.pow(2, Math.log2(f.frequency) + logStep);
      f.frequency = Math.min(DEFAULT_FREQ_RANGE.max, Math.round(newFreq));
    });
  }

  function decrementFilterFrequency(filter: Filter) {
    const config = createLinkedChannelConfig();
    updateFilterPropertyLinked(config, filter.id, (f: Filter) => {
      const logStep = Math.log2(2) / CONFIG_STEPS_PER_OCTAVE;
      const newFreq = Math.pow(2, Math.log2(f.frequency) - logStep);
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
        f.Q = Math.max(0.1, f.Q / CONFIG_Q_STEP_FACTOR);
      }
    });
  }

  function narrowFilterBand(filter: Filter) {
    const config = createLinkedChannelConfig();
    updateFilterPropertyLinked(config, filter.id, (f: Filter) => {
      if (typeof f.Q === 'number') {
        f.Q = Math.min(25.0, f.Q * CONFIG_Q_STEP_FACTOR);
      }
    });
  }

  function updateGenericCoeff(filter: Filter, coeffName: string, event: Event) {
    const target = event.target as HTMLInputElement;
    const value = parseFloat(target.value);
    if (isNaN(value)) return;

    const config = createLinkedChannelConfig();
    updateGenericCoeffLinked(config, filter.id, coeffName, value);
  }

  // Graph event handlers
  function onGraphUpdateFreqGain({ id, frequency, gain }: { id: number; frequency: number; gain: number }) {
    if (channelMode.value === 'both') {
      const lf = leftFilters.value.find(f => f.id === id);
      const rf = rightFilters.value.find(f => f.id === id);
      if (lf) { lf.frequency = frequency; lf.gain = gain; }
      if (rf) { rf.frequency = frequency; rf.gain = gain; }
    } else {
      const f = filters.value.find(f => f.id === id);
      if (f) { f.frequency = frequency; f.gain = gain; }
    }
  }

  function onGraphUpdateQ({ id, Q }: { id: number; Q: number }) {
    if (channelMode.value === 'both') {
      const lf = leftFilters.value.find(f => f.id === id);
      const rf = rightFilters.value.find(f => f.id === id);
      if (lf && typeof lf.Q === 'number') lf.Q = Q;
      if (rf && typeof rf.Q === 'number') rf.Q = Q;
    } else {
      const f = filters.value.find(f => f.id === id);
      if (f && typeof f.Q === 'number') f.Q = Q;
    }
  }

  function onGraphDragStart() {
    isDragging.value = true;
  }

  async function onGraphDragEnd(id: number) {
    const config = createLinkedChannelConfig();
    await updateFilterPropertyLinked(config, id, () => { /* persist current values */ });
    isDragging.value = false;
  }

  return {
    // State
    activeChannel,
    channelMode,
    leftFilters,
    rightFilters,
    activeFilterId,
    isDragging,
    backendCapabilities,
    backendName,
    filters,
    canAddFilterToCurrentChannel,
    currentChannelFilterInfo,

    // Operations
    initialize,
    loadBackendCapabilities,
    loadFiltersFromBackend,
    setActiveChannel,
    toggleChannelMode,
    addFilterOfType,
    removeFilter,
    toggleFilterEnabled,
    incrementFilterFrequency,
    decrementFilterFrequency,
    incrementFilterGain,
    decrementFilterGain,
    widenFilterBand,
    narrowFilterBand,
    updateGenericCoeff,

    // Graph handlers
    onGraphUpdateFreqGain,
    onGraphUpdateQ,
    onGraphDragStart,
    onGraphDragEnd,

    // Internals exposed for other composables
    createLinkedChannelConfig,
    SAMPLE_RATE,
  };
}
