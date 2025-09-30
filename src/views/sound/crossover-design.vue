<template>
  <div class="crossover-design">
    <div class="header">
      <h1>Crossover Design</h1>
      <div class="header-actions">
        <button class="btn" @click="refresh">
          <AppIcon icon="refresh" />
          <span>Refresh</span>
        </button>
      </div>
    </div>

  <!-- Channel tabs will be inside the panel below (matching Speaker EQ) -->

    <!-- Graph -->
    <div class="card">
      <FilterGraph
        :filters="filters"
        :active-filter-id="activeFilterId"
        :show-bandwidth-lines="true"
        :sample-rate="SAMPLE_RATE"
        @set-active-filter="setActiveFilter"
        @update:freq-gain="onUpdateFreqGain"
        @update:q="onUpdateQ"
        @drag-start="onDragStart"
        @drag-end="onDragEnd"
      />
    </div>

    <!-- Equaliser Panel (tabs + filters) to match Speaker EQ placement -->
    <div class="card mt-3">
      <div class="equaliser-panel">
        <div class="tabs">
          <button v-for="c in channels" :key="c.key" :class="['tab', { active: activeChannel === c.key }]" @click="setActiveChannel(c.key)">
            {{ c.label }}
          </button>
        </div>

        <div class="filters">
      <div class="filters-header">
        <div class="left">
          <h2>Channel {{ currentChannelLabel }}</h2>
          <span v-if="currentBankInfo" class="bank-info">
            {{ currentBankInfo.currentFilterCount }}/{{ currentBankInfo.maxFilters }} filters
          </span>
        </div>
        <div class="right">
          <button class="btn primary" :disabled="!canAddFilter" @click="showAddFilterModal = true">
            <AppIcon icon="plus" />
            <span>Add Filter</span>
          </button>
        </div>
      </div>

      <div class="filters-list">
        <div v-for="filter in filters" :key="filter.id" class="card">
          <div class="filter-item" :class="{ active: activeFilterId === filter.id }" @click="setActiveFilter(filter.id)">
            <div class="filter-main">
              <div class="filter-info">
                <AppIcon :icon="getFilterIconName(filter.icon)" class="filter-icon" :class="filter.icon === 'peaking' ? 'icon-stroke' : ''" />
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
                    {{ formatFilterTypeName(filter.icon) }} |
                    {{ filter.frequency }} Hz |
                    {{ filter.gain }} dB |
                    Q {{ filter.Q ? filter.Q.toFixed(2) : 'N/A' }}
                  </h3>
                </div>
              </div>
            </div>
            <div class="filter-actions">
              <button class="btn sm" @click="decrementFilterFrequency(filter)">-f</button>
              <button class="btn sm" @click="incrementFilterFrequency(filter)">+f</button>
              <button class="btn sm" @click="decrementFilterGain(filter)">-g</button>
              <button class="btn sm" @click="incrementFilterGain(filter)">+g</button>
              <button class="btn sm" @click="widenFilterBand(filter)">−Q</button>
              <button class="btn sm" @click="narrowFilterBand(filter)">+Q</button>
              <button class="btn sm" @click="toggleFilterEnabled(filter)">
                <AppIcon :icon="filter.enabled ? 'eye' : 'eye-off'" />
              </button>
              <button class="btn sm danger" @click="removeFilter(filter.id)">
                <AppIcon icon="trash" />
              </button>
            </div>
          </div>
        </div>

        <div class="card add-card" :class="{ disabled: !canAddFilter }" @click="canAddFilter && (showAddFilterModal = true)">
          <div class="filter-item add-filter-item">
            <div class="filter-main">
              <div class="filter-info">
                <AppIcon icon="plus" class="filter-icon" />
                <div class="filter-details">
                  <h3>{{ canAddFilter ? 'Add New Filter' : 'Maximum Filters Reached' }}</h3>
                  <div class="filter-frequency">
                    <span v-if="currentBankInfo">
                      {{ currentBankInfo.currentFilterCount }}/{{ currentBankInfo.maxFilters }} filters
                    </span>
                    <span v-else-if="canAddFilter">Click to add</span>
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

    <!-- Add Filter Modal -->
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
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import FilterGraph from '@/components/filter-graph.vue'
import { useFilterStore, type BackendCapabilities } from '@/stores/filter_connector'
import { type Filter } from '@/utils/filtercalc'
import { type BiquadFilterType } from '@/utils/biquad'
import { getFilterIconName, formatFilterTypeName } from '@/utils/filter-display'
import { DEFAULT_FREQ_RANGE, DEFAULT_GAIN_RANGE } from '@/utils/filtergraph'
import {
  type LinkedChannelConfig,
  type ChannelMode as LinkedChannelMode,
  addFilterToLinkedChannels,
  removeFilterFromLinkedChannels,
  updateFilterPropertyLinked,
  toggleFilterEnabledLinked
} from '@/utils/linked-channel-operations'
import { convertUIFilterToStore, convertStoreFilterToUI } from '@/utils/filter-conversions'

// Channels A-D mapped to IIR_A..IIR_D in DSP, and to iir_a..iir_d in filter store
const channels = [
  { key: 'a', label: 'A', storeBank: 'iir_a', dspAddress: 'IIR_A' },
  { key: 'b', label: 'B', storeBank: 'iir_b', dspAddress: 'IIR_B' },
  { key: 'c', label: 'C', storeBank: 'iir_c', dspAddress: 'IIR_C' },
  { key: 'd', label: 'D', storeBank: 'iir_d', dspAddress: 'IIR_D' }
]

type ChannelKey = typeof channels[number]['key']

// UI State
const activeChannel = ref<ChannelKey>('a')
const showAddFilterModal = ref(false)

// Store and backend
const filterStore = useFilterStore()
const backendCapabilities = ref<BackendCapabilities | null>(null)

// Filter arrays per channel
const channelFilters = ref<Record<ChannelKey, Filter[]>>({ a: [], b: [], c: [], d: [] })

// Available filter types (matching Speaker EQ for now)
const AVAILABLE_FILTER_TYPES: BiquadFilterType[] = ['lowshelf', 'peaking', 'highshelf', 'generic_normalized']

// Display helpers via shared utils

// Computed helpers
const currentChannelLabel = computed(() => channels.find(c => c.key === activeChannel.value)?.label || 'A')
const currentStoreBank = computed(() => channels.find(c => c.key === activeChannel.value)!.storeBank)

const filters = computed(() => channelFilters.value[activeChannel.value])

const currentBankInfo = computed(() => {
  const caps = backendCapabilities.value
  if (!caps) return null
  const bankName = currentStoreBank.value
  return caps.availableFilterBanks.find(b => b.name === bankName) || null
})

const canAddFilter = computed(() => {
  if (!backendCapabilities.value) return false
  const info = currentBankInfo.value
  return !!info && info.currentFilterCount < info.maxFilters
})

// Initialize backend and load filters
const loadBackendCapabilities = async () => {
  try {
    backendCapabilities.value = await filterStore.getBackendCapabilities()
  } catch (e) {
    console.error('Failed to load backend capabilities', e)
  }
}

const loadFiltersFromBackend = async () => {
  try {
    await filterStore.syncFromBackend()
    const banks = filterStore.filterBanks
    for (const c of channels) {
      const arr = banks[c.storeBank]?.filters || []
      channelFilters.value[c.key] = arr.map((f, idx) => convertStoreFilterToUI(f, `${c.key}_${idx + 1}`))
    }
  } catch (e) {
    console.error('Failed to load filters from backend', e)
  }
}

// Linked config for A–D
const createLinkedChannelConfig = (): LinkedChannelConfig => {
  const arrays: Record<string, Filter[]> = {}
  const bankAddresses: Record<string, string> = {}

  for (const c of channels) {
    arrays[c.key] = channelFilters.value[c.key]
    bankAddresses[c.key] = c.dspAddress
  }

  return {
  channelMode: 'individual' as LinkedChannelMode,
    activeChannel: activeChannel.value,
    channelArrays: arrays,
    bankAddresses,
    updateStoreCallback: async (channelName: string, filterIndex: number, filter: Filter) => {
      const storeBank = channels.find(c => c.key === channelName as ChannelKey)!.storeBank
      await filterStore.updateFilter(storeBank, filterIndex, convertUIFilterToStore(filter))
    },
    addStoreCallback: async (channelName: string, filterIndex: number, filter: Filter) => {
      const storeBank = channels.find(c => c.key === channelName as ChannelKey)!.storeBank
      await filterStore.addFilter(storeBank, filterIndex, convertUIFilterToStore(filter))
    },
    removeStoreCallback: async (channelName: string, filterIndex: number) => {
      const storeBank = channels.find(c => c.key === channelName as ChannelKey)!.storeBank
      await filterStore.removeFilter(storeBank, filterIndex)
    },
    clearStoreCallback: async (channelName: string) => {
      const storeBank = channels.find(c => c.key === channelName as ChannelKey)!.storeBank
      await filterStore.clearFiltersFromBank(storeBank)
    }
  }
}

// UI Actions
function setActiveChannel(key: ChannelKey) {
  activeChannel.value = key
  const arr = channelFilters.value[key]
  activeFilterId.value = arr.length ? arr[0].id : null
}

const addFilterOfType = async (type: BiquadFilterType) => {
  try {
    const newId = Date.now()
    const newFilter: Filter = {
      id: newId,
      icon: type,
      text: 'New',
      frequency: 1000,
      gain: 0,
      Q: 0.71,
      enabled: true,
    }
    if (type === 'generic_normalized') {
      newFilter.genericCoeffs = { b0: 1.0, b1: 0.0, b2: 0.0, a1: 0.0, a2: 0.0 }
    }

    const config = createLinkedChannelConfig()
    await addFilterToLinkedChannels(config, newFilter)
  activeFilterId.value = newId
    showAddFilterModal.value = false
    await loadBackendCapabilities()
  } catch (e) {
    console.error('Failed to add filter', e)
    alert('Failed to add filter')
  }
}

const removeFilter = async (filterId: number) => {
  const config = createLinkedChannelConfig()
  await removeFilterFromLinkedChannels(config, filterId)
  await loadBackendCapabilities()
}

// Frequency and Q controls (log steps like Speaker EQ)
const CONFIG_STEPS_PER_OCTAVE = 10
const incrementFilterFrequency = (filter: Filter) => {
  const config = createLinkedChannelConfig()
  updateFilterPropertyLinked(config, filter.id, (f: Filter) => {
    const logStep = Math.log2(2) / CONFIG_STEPS_PER_OCTAVE
    const currentLog = Math.log2(f.frequency)
    const newLog = currentLog + logStep
    f.frequency = Math.min(DEFAULT_FREQ_RANGE.max, Math.round(Math.pow(2, newLog)))
  })
}

const decrementFilterFrequency = (filter: Filter) => {
  const config = createLinkedChannelConfig()
  updateFilterPropertyLinked(config, filter.id, (f: Filter) => {
    const logStep = Math.log2(2) / CONFIG_STEPS_PER_OCTAVE
    const currentLog = Math.log2(f.frequency)
    const newLog = currentLog - logStep
    f.frequency = Math.max(DEFAULT_FREQ_RANGE.min, Math.round(Math.pow(2, newLog)))
  })
}

const incrementFilterGain = (filter: Filter) => {
  const config = createLinkedChannelConfig()
  updateFilterPropertyLinked(config, filter.id, (f: Filter) => {
    f.gain = Math.min(DEFAULT_GAIN_RANGE.max, (f.gain || 0) + 0.5)
  })
}

const decrementFilterGain = (filter: Filter) => {
  const config = createLinkedChannelConfig()
  updateFilterPropertyLinked(config, filter.id, (f: Filter) => {
    f.gain = Math.max(DEFAULT_GAIN_RANGE.min, (f.gain || 0) - 0.5)
  })
}

const widenFilterBand = (filter: Filter) => {
  const config = createLinkedChannelConfig()
  updateFilterPropertyLinked(config, filter.id, (f: Filter) => {
    if (typeof f.Q === 'number') {
      f.Q = Math.max(0.1, f.Q / 1.07)
    }
  })
}

const narrowFilterBand = (filter: Filter) => {
  const config = createLinkedChannelConfig()
  updateFilterPropertyLinked(config, filter.id, (f: Filter) => {
    if (typeof f.Q === 'number') {
      f.Q = Math.min(25.0, f.Q * 1.07)
    }
  })
}

const toggleFilterEnabled = async (filter: Filter) => {
  const config = createLinkedChannelConfig()
  await toggleFilterEnabledLinked(config, filter.id)
}

// Refresh
const refresh = async () => {
  await loadBackendCapabilities()
  await loadFiltersFromBackend()
}

// Initialization
onMounted(async () => {
  await filterStore.initializeBackend()
  await loadBackendCapabilities()
  // Create banks for A–D (if backend supports them)
  await filterStore.createMultipleFilterBanks(channels.map(c => c.storeBank))
  await loadFiltersFromBackend()
  await loadBackendCapabilities()
})
// Graph hookup (via FilterGraph component)
const SAMPLE_RATE = 48000
const activeFilterId = ref<number | null>(null)

function setActiveFilter(id: number) {
  activeFilterId.value = id
}

const onUpdateFreqGain = (payload: { id: number, frequency: number, gain: number }) => {
  // Update local state for smooth dragging; persist on drag-end
  const list = channelFilters.value[activeChannel.value]
  const idx = list.findIndex(f => f.id === payload.id)
  if (idx >= 0) {
    list[idx].frequency = payload.frequency
    list[idx].gain = Math.max(DEFAULT_GAIN_RANGE.min, Math.min(DEFAULT_GAIN_RANGE.max, payload.gain))
  }
}

const onUpdateQ = (payload: { id: number, Q: number }) => {
  const list = channelFilters.value[activeChannel.value]
  const idx = list.findIndex(f => f.id === payload.id)
  if (idx >= 0) {
    list[idx].Q = Math.max(0.1, Math.min(25.0, payload.Q))
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const onDragStart = (_id: number) => { /* optional */ }
const onDragEnd = async (id: number) => {
  const config = createLinkedChannelConfig()
  // Trigger store/backend update with current values
  await updateFilterPropertyLinked(config, id, () => { /* no-op */ })
}
</script>

<style scoped>
.crossover-design { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h1 { margin: 0; font-size: 24px; font-weight: 600; }
.header-actions .btn { display: inline-flex; align-items: center; gap: 6px; }

.channel-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.tabs { display: flex; gap: 8px; }
.tab { padding: 6px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--background-primary); cursor: pointer; }
.tab.active { border-color: var(--primary-color); box-shadow: 0 0 0 2px var(--primary-color-alpha); }

.mode-toggle { display: flex; align-items: center; gap: 8px; }
.mode-label { color: var(--text-secondary); font-size: 0.9rem; }

.filters { margin-top: 8px; }
.graph { position: relative; border-radius: 8px; width: 100%; user-select: none; }
.graph svg { width: 100%; overflow: visible; user-select: none; }
.x-axis-labels, .y-axis-labels { font-family: 'Metropolis', sans-serif; font-weight: 400; font-size: 10px; }
.filters-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.filters-header .left { display: flex; align-items: center; gap: 12px; }
.filters-header h2 { margin: 0; font-size: 18px; font-weight: 600; }
.bank-info { color: var(--text-secondary); font-size: 0.9rem; }

.filters-list { display: grid; grid-template-columns: 1fr; gap: 8px; }
.card { border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; background: var(--background-secondary); }
.filter-item { display: flex; justify-content: space-between; align-items: center; }
.filter-main { display: flex; align-items: center; gap: 10px; }
.filter-info { display: flex; align-items: center; gap: 10px; }
.filter-icon { width: 24px; height: 24px; }
.filter-details h3 { margin: 0; font-weight: 500; font-size: 14px; white-space: pre-line; }
.filter-actions { display: flex; gap: 6px; }
.btn { padding: 6px 10px; border: 1px solid var(--border-color); background: var(--background-primary); border-radius: 6px; cursor: pointer; }
.btn.primary { background: var(--primary-color); color: white; border-color: var(--primary-color); }
.btn.sm { padding: 4px 8px; font-size: 12px; }
.btn.danger { border-color: var(--error-color); color: var(--error-color); }
.add-card { opacity: 0.95; }
.add-card.disabled { opacity: 0.6; cursor: not-allowed; }

/* Switch */
.switch { position: relative; display: inline-block; width: 42px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .2s; border-radius: 24px; }
.slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .2s; border-radius: 50%; }
.switch input:checked + .slider { background-color: var(--primary-color); }
.switch input:checked + .slider:before { transform: translateX(18px); }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: var(--background-primary); border-radius: 8px; padding: 20px; width: min(520px, 96vw); }
.filter-type-selector { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 16px; }
.filter-type-option { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--background-secondary); cursor: pointer; }
.filter-name { font-size: 12px; color: var(--text-secondary); white-space: pre-line; text-align: center; }
@media (max-width: 768px) {
  .crossover-design { padding: 10px; }
  .card { padding: 20px; min-height: 300px; }
}
</style>
