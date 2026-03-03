/**
 * Composable for managing crossover design filter operations.
 * Handles dynamic channel count (A-H), pair-based linking, and filter CRUD.
 */

import { ref, computed } from 'vue';
import { type Filter } from '@/utils/filtercalc';
import { type BiquadFilterType } from '@/utils/biquad';
import { useFilterStore, type BackendCapabilities } from '@/stores/filter_connector';
import { useToastStore } from '@/stores/toast';
import { convertUIFilterToStore, convertStoreFilterToUI } from '@/utils/filter-conversions';
import { DEFAULT_FREQ_RANGE, DEFAULT_GAIN_RANGE } from '@/utils/filtergraph';
import {
  readChannelDelay, writeChannelDelay,
  readChannelLevel, writeChannelLevel,
  readChannelInvert, writeChannelInvert,
  readChannelSelect, writeChannelSelect,
} from '@/api/dsptoolkit';
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

export function useCrossoverFilters() {
  const filterStore = useFilterStore();
  const toastStore = useToastStore();

  // State — dynamic channels
  const channelNames = ref<string[]>([]);
  const activeChannel = ref<string>('');
  const channelFilters = ref<Record<string, Filter[]>>({});
  const activeFilterId = ref<number | null>(null);
  const isDragging = ref(false);

  // Bank addresses: channel name → metadata key (e.g., 'iir_a' → 'IIR_A')
  const bankAddresses = ref<Record<string, string>>({});

  // Pair linking state: each pair has an independent link toggle
  // Pairs are sequential: [A,B], [C,D], [E,F], [G,H]
  const linkedPairs = ref<Record<string, boolean>>({});

  // Backend capabilities
  const backendCapabilities = ref<BackendCapabilities | null>(null);
  const backendName = ref('');

  // Per-channel settings (delay, level, invert, channel select)
  const channelSettings = ref<Record<string, {
    delay: number       // samples (UI converts: ms = samples / sampleRate * 1000)
    level: number       // linear gain (UI shows dB = 20 * log10(level))
    inverted: boolean
    channelSelect: number  // 0=L, 1=R, 2=Mono, 3=Surround
  }>>({});

  const channelFeatures = ref<Record<string, {
    hasDelay: boolean
    hasLevel: boolean
    hasInvert: boolean
    hasChannelSelect: boolean
    delayAddress?: number
    levelAddress?: number
    invertAddress?: number
    channelSelectAddress?: number
  }>>({});

  const sampleRate = ref(SAMPLE_RATE);

  // Computed
  const filters = computed(() => {
    return channelFilters.value[activeChannel.value] ?? [];
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

  // Get the pair partner for a channel, or null if unpaired (odd channel count)
  function getPairPartner(channel: string): string | null {
    const idx = channelNames.value.indexOf(channel);
    if (idx === -1) return null;
    const pairIndex = idx % 2 === 0 ? idx + 1 : idx - 1;
    return channelNames.value[pairIndex] ?? null;
  }

  // Get the pair key for a channel (the first channel name in the pair)
  function getPairKey(channel: string): string | null {
    const idx = channelNames.value.indexOf(channel);
    if (idx === -1) return null;
    const pairStartIdx = idx % 2 === 0 ? idx : idx - 1;
    return channelNames.value[pairStartIdx] ?? null;
  }

  // Check if the active channel's pair is linked
  const isCurrentPairLinked = computed(() => {
    const pairKey = getPairKey(activeChannel.value);
    return pairKey ? (linkedPairs.value[pairKey] ?? false) : false;
  });

  // Determine channel mode based on pair linking
  function getChannelMode(): LinkedChannelMode {
    return isCurrentPairLinked.value ? 'both' : 'individual';
  }

  // Linked channel config helper
  function createLinkedChannelConfig(): LinkedChannelConfig {
    // Determine which channels are affected
    const targetChannels: string[] = [activeChannel.value];
    if (isCurrentPairLinked.value) {
      const partner = getPairPartner(activeChannel.value);
      if (partner) targetChannels.push(partner);
    }

    // Build channel arrays and bank addresses for target channels
    const arrays: Record<string, Filter[]> = {};
    const addresses: Record<string, string> = {};
    for (const ch of targetChannels) {
      arrays[ch] = channelFilters.value[ch] ?? [];
      addresses[ch] = bankAddresses.value[ch] ?? ch;
    }

    return {
      channelMode: getChannelMode(),
      activeChannel: activeChannel.value,
      channelArrays: arrays,
      bankAddresses: addresses,
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
      console.error('crossover-design: Failed to load backend capabilities:', error);
    }
  }

  async function loadFiltersFromBackend() {
    try {
      await filterStore.syncFromBackend();
      const backendFilters = filterStore.filterBanks;

      for (const ch of channelNames.value) {
        if (backendFilters[ch]?.filters) {
          channelFilters.value[ch] = backendFilters[ch].filters.map((filter, index) =>
            convertStoreFilterToUI(filter, `${ch}_${index + 1}`)
          );
        }
      }
    } catch (error) {
      console.error('crossover-design: Failed to load filters from backend:', error);
    }
  }

  async function initialize() {
    await filterStore.initializeBackend();
    await loadBackendCapabilities();

    // Discover crossover channels from backend
    const crossoverBanks = await filterStore.getFilterBanksByType('crossover-designer');
    channelNames.value = crossoverBanks;

    if (crossoverBanks.length > 0) {
      activeChannel.value = crossoverBanks[0];
    }

    // Build bank addresses from capabilities
    if (backendCapabilities.value) {
      for (const bankInfo of backendCapabilities.value.availableFilterBanks) {
        if (bankInfo.bankAddress) {
          bankAddresses.value[bankInfo.name] = bankInfo.bankAddress;
        }
      }
    }

    // Store sample rate from backend
    if (backendCapabilities.value?.sampleRate) {
      sampleRate.value = backendCapabilities.value.sampleRate;
    }

    // Build channel features map and read current settings from hardware
    if (backendCapabilities.value) {
      for (const bankInfo of backendCapabilities.value.availableFilterBanks) {
        const ch = bankInfo.name;
        const features = {
          hasDelay: bankInfo.delayAddress != null,
          hasLevel: bankInfo.levelAddress != null,
          hasInvert: bankInfo.invertAddress != null,
          hasChannelSelect: bankInfo.channelSelectAddress != null,
          delayAddress: bankInfo.delayAddress,
          levelAddress: bankInfo.levelAddress,
          invertAddress: bankInfo.invertAddress,
          channelSelectAddress: bankInfo.channelSelectAddress,
        };
        channelFeatures.value[ch] = features;

        // Read current values from hardware
        const settings = { delay: 0, level: 1.0, inverted: false, channelSelect: 0 };
        try {
          if (features.hasDelay && features.delayAddress != null) {
            settings.delay = await readChannelDelay(features.delayAddress);
          }
          if (features.hasLevel && features.levelAddress != null) {
            settings.level = await readChannelLevel(features.levelAddress);
          }
          if (features.hasInvert && features.invertAddress != null) {
            settings.inverted = await readChannelInvert(features.invertAddress);
          }
          if (features.hasChannelSelect && features.channelSelectAddress != null) {
            settings.channelSelect = await readChannelSelect(features.channelSelectAddress);
          }
        } catch (error) {
          console.warn(`crossover-design: Failed to read settings for channel ${ch}:`, error);
        }
        channelSettings.value[ch] = settings;
      }
    }

    // Initialize empty filter arrays for each channel
    for (const ch of crossoverBanks) {
      if (!channelFilters.value[ch]) {
        channelFilters.value[ch] = [];
      }
    }

    // Initialize pair linking state (all unlinked by default)
    for (let i = 0; i < crossoverBanks.length - 1; i += 2) {
      linkedPairs.value[crossoverBanks[i]] = false;
    }

    await filterStore.createMultipleFilterBanks(crossoverBanks);
    await loadFiltersFromBackend();
    await loadBackendCapabilities();
  }

  // Channel operations
  function setActiveChannel(channel: string) {
    activeChannel.value = channel;
    const currentFilters = channelFilters.value[channel] ?? [];
    activeFilterId.value = currentFilters[0]?.id ?? null;
  }

  async function togglePairLink(pairKey?: string) {
    const key = pairKey ?? getPairKey(activeChannel.value);
    if (!key) return;

    const wasLinked = linkedPairs.value[key] ?? false;
    linkedPairs.value[key] = !wasLinked;

    // When linking, copy active channel's filters to partner
    if (!wasLinked) {
      const partner = getPairPartner(activeChannel.value);
      if (partner) {
        try {
          const config = createLinkedChannelConfig();
          await copyFiltersToChannels(config, activeChannel.value, [partner]);
          // Reload to reflect the copied filters
          await loadFiltersFromBackend();
        } catch (error) {
          console.error(`crossover-design: Failed to sync filters to ${partner}:`, error);
        }
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
      console.error('crossover-design: Failed to add filter:', error);
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
      console.error('crossover-design: Failed to toggle filter enabled state:', error);
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
    if (isCurrentPairLinked.value) {
      const partner = getPairPartner(activeChannel.value);
      const af = (channelFilters.value[activeChannel.value] ?? []).find(f => f.id === id);
      if (af) { af.frequency = frequency; af.gain = gain; }
      if (partner) {
        const pf = (channelFilters.value[partner] ?? []).find(f => f.id === id);
        if (pf) { pf.frequency = frequency; pf.gain = gain; }
      }
    } else {
      const f = filters.value.find(f => f.id === id);
      if (f) { f.frequency = frequency; f.gain = gain; }
    }
  }

  function onGraphUpdateQ({ id, Q }: { id: number; Q: number }) {
    if (isCurrentPairLinked.value) {
      const partner = getPairPartner(activeChannel.value);
      const af = (channelFilters.value[activeChannel.value] ?? []).find(f => f.id === id);
      if (af && typeof af.Q === 'number') af.Q = Q;
      if (partner) {
        const pf = (channelFilters.value[partner] ?? []).find(f => f.id === id);
        if (pf && typeof pf.Q === 'number') pf.Q = Q;
      }
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

  // Channel settings setters
  async function setChannelDelay(channel: string, ms: number) {
    const features = channelFeatures.value[channel];
    if (!features?.hasDelay || features.delayAddress == null) return;
    const samples = Math.round(ms / 1000 * sampleRate.value);
    await writeChannelDelay(features.delayAddress, samples);
    channelSettings.value[channel].delay = samples;
  }

  async function setChannelLevel(channel: string, dB: number) {
    const features = channelFeatures.value[channel];
    if (!features?.hasLevel || features.levelAddress == null) return;
    const linearGain = Math.pow(10, dB / 20);
    await writeChannelLevel(features.levelAddress, linearGain);
    channelSettings.value[channel].level = linearGain;

    // Level is linked: apply to partner when pair is linked
    if (isCurrentPairLinked.value) {
      const partner = getPairPartner(channel);
      if (partner) {
        const partnerFeatures = channelFeatures.value[partner];
        if (partnerFeatures?.hasLevel && partnerFeatures.levelAddress != null) {
          await writeChannelLevel(partnerFeatures.levelAddress, linearGain);
          channelSettings.value[partner].level = linearGain;
        }
      }
    }
  }

  async function setChannelInvert(channel: string, inverted: boolean) {
    const features = channelFeatures.value[channel];
    if (!features?.hasInvert || features.invertAddress == null) return;
    await writeChannelInvert(features.invertAddress, inverted);
    channelSettings.value[channel].inverted = inverted;
  }

  async function setChannelSelectMode(channel: string, mode: number) {
    const features = channelFeatures.value[channel];
    if (!features?.hasChannelSelect || features.channelSelectAddress == null) return;
    await writeChannelSelect(features.channelSelectAddress, mode);
    channelSettings.value[channel].channelSelect = mode;
  }

  // Computed helpers for UI display
  function getChannelDelayMs(channel: string): number {
    const settings = channelSettings.value[channel];
    if (!settings) return 0;
    return settings.delay / sampleRate.value * 1000;
  }

  function getChannelLevelDb(channel: string): number {
    const settings = channelSettings.value[channel];
    if (!settings || settings.level <= 0) return -60;
    return 20 * Math.log10(settings.level);
  }

  return {
    // State
    channelNames,
    activeChannel,
    channelFilters,
    activeFilterId,
    isDragging,
    backendCapabilities,
    backendName,
    filters,
    canAddFilterToCurrentChannel,
    currentChannelFilterInfo,

    // Pair linking
    linkedPairs,
    isCurrentPairLinked,
    getPairPartner,
    getPairKey,
    togglePairLink,

    // Operations
    initialize,
    loadBackendCapabilities,
    loadFiltersFromBackend,
    setActiveChannel,
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

    // Channel settings
    channelSettings,
    channelFeatures,
    sampleRate,
    setChannelDelay,
    setChannelLevel,
    setChannelInvert,
    setChannelSelectMode,
    getChannelDelayMs,
    getChannelLevelDb,

    // Internals exposed for other composables
    createLinkedChannelConfig,
    SAMPLE_RATE,
  };
}
