import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import type { Filter } from '@/utils/filtercalc'

const listSpeakerPresets = vi.fn()
const clearSpeakerPreset = vi.fn()

vi.mock('@/api/dsptoolkit', () => ({
  listSpeakerPresets: () => listSpeakerPresets(),
  clearSpeakerPreset: () => clearSpeakerPreset(),
  setFilterBankBypassState: vi.fn(),
  readChannelDelay: vi.fn(),
  writeChannelDelay: vi.fn(),
  readChannelLevel: vi.fn(),
  writeChannelLevel: vi.fn(),
  readChannelInvert: vi.fn(),
  writeChannelInvert: vi.fn(),
  readChannelSelect: vi.fn(),
  writeChannelSelect: vi.fn(),
}))

const removeFilter = vi.fn()
const addFilterOfType = vi.fn()
const loadFiltersFromBackend = vi.fn(async () => {})
const loadBackendCapabilities = vi.fn(async () => {})
const channelFilters = ref<Record<string, Filter[]>>({ iir_a: [] })

vi.mock('@/composables/useCrossoverFilters', () => ({
  useCrossoverFilters: () => ({
    channelNames: ref(['iir_a', 'iir_b']),
    activeChannel: ref('iir_a'),
    channelFilters,
    activeFilterId: ref(null),
    isDragging: ref(false),
    backendCapabilities: ref({
      availableFilterBanks: [
        { name: 'iir_a', maxFilters: 16, currentFilterCount: channelFilters.value.iir_a.length, filterBankType: 'crossover-designer' },
      ],
      backendName: 'HiFiBery DSP',
      backendDescription: '',
      backendShortDescription: '',
    }),
    backendName: ref('HiFiBery DSP'),
    filters: computed(() => channelFilters.value.iir_a),
    canAddFilterToCurrentChannel: computed(() => true),
    currentChannelFilterInfo: computed(() => ({
      name: 'iir_a',
      maxFilters: 16,
      currentFilterCount: channelFilters.value.iir_a.length,
      filterBankType: 'crossover-designer',
    })),
    isCurrentPairLinked: computed(() => false),
    getPairPartner: () => 'iir_b',
    getPairKey: () => 'iir_a',
    togglePairLink: vi.fn(),
    initialize: vi.fn(async () => {}),
    loadBackendCapabilities,
    loadFiltersFromBackend,
    setActiveChannel: vi.fn(),
    addFilterOfType,
    removeFilter,
    toggleFilterEnabled: vi.fn(),
    incrementFilterFrequency: vi.fn(),
    decrementFilterFrequency: vi.fn(),
    incrementFilterGain: vi.fn(),
    decrementFilterGain: vi.fn(),
    widenFilterBand: vi.fn(),
    narrowFilterBand: vi.fn(),
    updateGenericCoeff: vi.fn(),
    onGraphUpdateFreqGain: vi.fn(),
    onGraphUpdateQ: vi.fn(),
    onGraphDragStart: vi.fn(),
    onGraphDragEnd: vi.fn(),
    channelSettings: ref({}),
    channelFeatures: ref({}),
    setChannelDelay: vi.fn(),
    setChannelLevel: vi.fn(),
    setChannelInvert: vi.fn(),
    setChannelSelectMode: vi.fn(),
    getChannelDelayMs: () => 0,
    getChannelLevelDb: () => 0,
    SAMPLE_RATE: 48000,
  }),
}))

import CrossoverDesign from '@/views/sound/crossover-design.vue'

const generic = (id: number): Filter => ({
  id, kind: 'generic_normalized', text: '0', frequency: 0, gain: 0, Q: 0.71, enabled: true,
  genericCoeffs: { b0: 0.87, b1: -1.8, b2: 0.85, a1: -1.9, a2: 0.9 },
})

const peaking = (frequency: number): Filter => ({
  id: frequency, kind: 'peaking', text: `${frequency}`, frequency, gain: -3, Q: 1, enabled: true,
})

const render = async () => {
  const wrapper = mount(CrossoverDesign, {
    global: {
      stubs: {
        Icon: true,
        PageContent: { template: '<div><slot /></div>' },
        FilterGraph: { name: 'FilterGraph', props: ['filters'], template: '<div data-test="graph" />' },
        AddFilterModal: true,
        BackendInfoModal: true,
        ConfirmationDialog: {
          props: ['isOpen'],
          emits: ['confirm', 'close'],
          template: '<div v-if="isOpen" data-test="dialog"><button data-test="dialog-confirm" @click="$emit(\'confirm\')" /></div>',
        },
      },
    },
  })
  await flushPromises()
  return wrapper
}

describe('crossover design with a preset-owned bank', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    listSpeakerPresets.mockResolvedValue({
      presets: [{ id: 'beovox-s35', name: 'Beovox S 35' }],
      current: 'beovox-s35',
    })
    clearSpeakerPreset.mockResolvedValue({
      status: 'success', cleared: 'beovox-s35', banksCleared: 4, filtersCleared: 30,
    })
    channelFilters.value = { iir_a: [] }
  })

  it('shows no banner and leaves editing alone on a bank of ordinary filters', async () => {
    channelFilters.value.iir_a = [peaking(100), peaking(1000)]

    const wrapper = await render()

    expect(wrapper.find('[data-test="preset-lock-banner"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="add-filter"]').classes()).not.toContain('disabled')
  })

  it('names the preset in a banner without hiding the filters', async () => {
    channelFilters.value.iir_a = [generic(1), generic(2), generic(3)]

    const wrapper = await render()

    const banner = wrapper.find('[data-test="preset-lock-banner"]')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain('Beovox S 35')

    // Read-only must not mean invisible: the count and the curve stay.
    expect(wrapper.findAllComponents({ name: 'EqFilterItem' })).toHaveLength(3)
    expect(wrapper.text()).toContain('3/16 filters')
    expect(wrapper.find('[data-test="graph"]').exists()).toBe(true)
  })

  it('feeds the real filters to the graph so the curve is the preset\'s own', async () => {
    channelFilters.value.iir_a = [generic(1), generic(2)]

    const wrapper = await render()

    expect(wrapper.findComponent({ name: 'FilterGraph' }).props('filters')).toHaveLength(2)
  })

  it('refuses to add a filter to the bank', async () => {
    channelFilters.value.iir_a = [generic(1)]

    const wrapper = await render()
    await wrapper.find('[data-test="add-filter"]').trigger('click')

    expect(wrapper.find('[data-test="add-filter"]').classes()).toContain('disabled')
    expect(addFilterOfType).not.toHaveBeenCalled()
  })

  it('swallows a remove that would destroy the preset', async () => {
    channelFilters.value.iir_a = [generic(1)]

    const wrapper = await render()
    wrapper.findComponent({ name: 'EqFilterItem' }).vm.$emit('remove', 1)
    await flushPromises()

    expect(removeFilter).not.toHaveBeenCalled()
  })

  it('clears the preset behind a confirmation and reloads what the page shows', async () => {
    channelFilters.value.iir_a = [generic(1)]

    const wrapper = await render()
    await wrapper.find('[data-test="clear-preset"]').trigger('click')
    expect(wrapper.find('[data-test="dialog"]').exists()).toBe(true)

    await wrapper.find('[data-test="dialog-confirm"]').trigger('click')
    await flushPromises()

    expect(clearSpeakerPreset).toHaveBeenCalledTimes(1)
    expect(loadFiltersFromBackend).toHaveBeenCalled()
    expect(loadBackendCapabilities).toHaveBeenCalled()
  })
})
