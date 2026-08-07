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
 * Loading a correction must be one bank write per channel. The old path was
 * clear + one addFilter per band, and each addFilter rewrote the whole bank
 * (hifiberry-os#626).
 *
 * useRoomEQ's real signature takes three positional Refs (channelNames,
 * channelFilters, activeFilterId), not the destructured-object shape the
 * task brief sketched -- adjusted here to match src/composables/useRoomEQ.ts.
 */
describe('loadSelectedRoomEQConfig', () => {
  beforeEach(() => {
    setBankFilters.mockReset().mockResolvedValue(undefined)
    addFilter.mockReset()
    clearFiltersFromBank.mockReset()
  })

  it('writes each channel bank exactly once', async () => {
    const channelNames = ref(['left', 'right'])
    const channelFilters = ref<Record<string, unknown[]>>({ left: [], right: [] })
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
        filters: Array.from({ length: 16 }, (_, i) => ({
          type: 'eq', f: 100 * (i + 1), db: -3, q: 1,
        })),
      },
    }

    await roomEQ.loadSelectedRoomEQConfig(config as never, 'both')

    expect(setBankFilters).toHaveBeenCalledTimes(2)
    expect(setBankFilters.mock.calls[0][0]).toBe('left')
    expect(setBankFilters.mock.calls[0][1]).toHaveLength(16)
    expect(addFilter).not.toHaveBeenCalled()
  })
})
