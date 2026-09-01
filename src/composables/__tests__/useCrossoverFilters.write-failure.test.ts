import { describe, it, expect, vi, beforeEach } from 'vitest'

const addFilter = vi.fn()
const syncFromBackend = vi.fn()
const getBackendCapabilities = vi.fn()
const filterBanks: Record<string, { filters: unknown[] }> = { left: { filters: [] } }

vi.mock('@/stores/filter_connector', () => ({
  useFilterStore: () => ({
    addFilter,
    syncFromBackend,
    getBackendCapabilities,
    get filterBanks() {
      return filterBanks
    },
  }),
}))
vi.mock('@/stores/toast', () => ({ useToastStore: () => ({ showErrorToast: vi.fn() }) }))

import { useCrossoverFilters } from '@/composables/useCrossoverFilters'

/**
 * hifiberry-os#626: the UI must never keep displaying a filter the DSP
 * refused. A rejected per-filter write is reported to the user, but the
 * filter was already pushed into channelFilters before the write was
 * attempted -- so the editor has to fall back to what the hardware actually
 * holds rather than leaving the phantom on the curve.
 */
describe('useCrossoverFilters - rejected per-filter write', () => {
  beforeEach(() => {
    addFilter.mockReset()
    syncFromBackend.mockReset().mockResolvedValue(undefined)
    getBackendCapabilities.mockReset().mockResolvedValue({
      backendName: 'dsptoolkit',
      availableFilterBanks: [{ name: 'left', currentFilterCount: 0, maxFilters: 16 }],
    })
    filterBanks.left = { filters: [] }
  })

  it('drops a filter the backend refused, leaving what the hardware holds', async () => {
    addFilter.mockRejectedValue(new Error('DSP profile cannot render bandpass'))

    const eq = useCrossoverFilters()
    eq.channelNames.value = ['left']
    eq.activeChannel.value = 'left'
    eq.channelFilters.value = { left: [] }

    await eq.addFilterOfType('peaking')

    // The write rejected, so the hardware holds no filters -- the editor must
    // not keep showing the one it optimistically added.
    expect(eq.channelFilters.value.left).toEqual([])
  })
})
