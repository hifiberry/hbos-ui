import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const setBankFilters = vi.fn()
const addFilter = vi.fn()
const clearFiltersFromBank = vi.fn()

vi.mock('@/stores/filter_connector', () => ({
  useFilterStore: () => ({ setBankFilters, addFilter, clearFiltersFromBank }),
}))
vi.mock('@/api/config', () => ({ getConfigValue: vi.fn(), listConfigKeys: vi.fn() }))
vi.mock('@/stores/toast', () => ({ useToastStore: () => ({ showErrorToast: vi.fn() }) }))

import { useRoomEQ } from '@/composables/useRoomEQ'

/**
 * hifiberry-os#626: applying a Room EQ correction must never leave the UI
 * claiming a bank write that the hardware rejected. When
 * filterStore.setBankFilters() throws for a channel, channelFilters for that
 * channel must retain whatever was there before the attempt -- never the new
 * filters the hardware never actually stored.
 */
describe('loadSelectedRoomEQConfig - rejected bank write', () => {
  beforeEach(() => {
    setBankFilters.mockReset()
    addFilter.mockReset()
    clearFiltersFromBank.mockReset()
  })

  it('does not update channelFilters for a channel whose bank write rejects', async () => {
    setBankFilters.mockRejectedValue(new Error('hardware rejected write'))

    const channelNames = ref(['left', 'right'])
    const staleLeftFilters = [{ id: 1, icon: 'peaking', text: 'stale', frequency: 100, gain: -1, Q: 1, enabled: true }]
    const channelFilters = ref<Record<string, unknown[]>>({ left: staleLeftFilters, right: [] })
    const activeFilterId = ref<number | string | null>(null)

    const roomEQ = useRoomEQ(
      channelNames as never,
      channelFilters as never,
      activeFilterId as never
    )

    const config = {
      key: 'correction-filters.test',
      data: {
        name: 'test',
        created_at: '2026-08-01T00:00:00Z',
        filters: [
          { filter_type: 'eq', frequency: 200, gain_db: -3, q: 1 },
        ],
      },
    }

    await roomEQ.loadSelectedRoomEQConfig(config as never, 'left')

    // The write rejected -- channelFilters.left must still be the stale
    // filters, never the new (unwritten) ones. (Vue wraps the array in a
    // reactive proxy, so compare by value, not by reference.)
    expect(channelFilters.value.left).toEqual(staleLeftFilters)
  })
})
