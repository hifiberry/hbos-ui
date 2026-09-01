import { describe, it, expect, vi } from 'vitest'

import { applyLoadedChannelFilters } from '@/composables/useEqFileIO'
import { type Filter } from '@/utils/filtercalc'

/**
 * hifiberry-os#626: a loaded EQ file is arbitrary user input, and a legacy
 * save can carry an icon that no longer maps -- convertUIFilterToStore now
 * throws for those rather than silently substituting a peak. Converting each
 * channel inside the write loop meant the first channel was written to
 * hardware before the second was found to be unconvertible, leaving the two
 * channels holding different EQs behind a single error toast.
 */
describe('applyLoadedChannelFilters', () => {
  const peak = (frequency: number): Filter => ({
    id: 1, icon: 'peaking', text: 'p', frequency, gain: -3, Q: 1, enabled: true,
  } as Filter)

  it('writes no channel when a later channel cannot be converted', async () => {
    const setBankFilters = vi.fn().mockResolvedValue(undefined)

    const source = {
      left: [peak(100)],
      right: [{ ...peak(200), icon: 'no-such-filter-type' } as Filter],
    }

    await expect(
      applyLoadedChannelFilters(setBankFilters, ['left', 'right'], source)
    ).rejects.toThrow(/no-such-filter-type/)

    // 'left' must not have been written: the file could not be applied whole.
    expect(setBankFilters).not.toHaveBeenCalled()
  })

  it('writes every channel it was given when they all convert', async () => {
    const setBankFilters = vi.fn().mockResolvedValue(undefined)

    const applied = await applyLoadedChannelFilters(
      setBankFilters, ['left', 'right'], { left: [peak(100)], right: [peak(200)] }
    )

    expect(setBankFilters.mock.calls.map((c) => c[0])).toEqual(['left', 'right'])
    expect(Object.keys(applied)).toEqual(['left', 'right'])
  })
})
