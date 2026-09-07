import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

const listSpeakerPresets = vi.fn()
const clearSpeakerPreset = vi.fn()

vi.mock('@/api/dsptoolkit', () => ({
  listSpeakerPresets: () => listSpeakerPresets(),
  clearSpeakerPreset: () => clearSpeakerPreset(),
}))

import { usePresetLock } from '@/composables/usePresetLock'
import type { Filter } from '@/utils/filtercalc'

const peaking = (frequency: number): Filter => ({
  id: frequency, kind: 'peaking', text: `${frequency}`, frequency, gain: -3, Q: 1, enabled: true,
})

const generic = (id: number): Filter => ({
  id, kind: 'generic_normalized', text: '0', frequency: 0, gain: 0, Q: 0.71, enabled: true,
  genericCoeffs: { b0: 0.87, b1: -1.8, b2: 0.85, a1: -1.9, a2: 0.9 },
})

describe('usePresetLock', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    listSpeakerPresets.mockResolvedValue({
      presets: [{ id: 'beovox-s35', name: 'Beovox S 35' }],
      current: 'beovox-s35',
    })
    clearSpeakerPreset.mockResolvedValue({
      status: 'success', cleared: 'beovox-s35', banksCleared: 4, filtersCleared: 30,
    })
  })

  it('leaves a bank of ordinary typed filters editable', () => {
    // Room EQ corrections land here as peak/shelf filters and must keep
    // behaving exactly as they do now.
    const { isPresetOwned } = usePresetLock(ref([peaking(100), peaking(1000)]))

    expect(isPresetOwned.value).toBe(false)
  })

  it('locks a bank holding even one raw-coefficient filter', () => {
    const { isPresetOwned } = usePresetLock(ref([peaking(100), generic(2)]))

    expect(isPresetOwned.value).toBe(true)
  })

  it('names the applied preset in the banner', async () => {
    const { lockMessage, loadAppliedPreset } = usePresetLock(ref([generic(1)]))

    await loadAppliedPreset()

    expect(lockMessage.value).toContain('Beovox S 35')
    expect(lockMessage.value).toContain('cannot be edited band-by-band')
  })

  it('still says the filters are locked when the preset name cannot be fetched', async () => {
    listSpeakerPresets.mockRejectedValue(new Error('dsp unreachable'))
    const { lockMessage, isPresetOwned, loadAppliedPreset } = usePresetLock(ref([generic(1)]))

    await loadAppliedPreset()

    expect(isPresetOwned.value).toBe(true)
    expect(lockMessage.value).toContain('cannot be edited band-by-band')
  })

  it('stops a mutating handler while the bank is preset-owned', () => {
    const write = vi.fn()
    const { readOnly } = usePresetLock(ref([generic(1)]))

    readOnly(write)(42)

    expect(write).not.toHaveBeenCalled()
  })

  it('passes the same handler straight through on an ordinary bank', () => {
    const write = vi.fn(() => 'written')
    const { readOnly } = usePresetLock(ref([peaking(100)]))

    expect(readOnly(write)(42)).toBe('written')
    expect(write).toHaveBeenCalledWith(42)
  })

  it('clears the preset and reloads the page state', async () => {
    const reload = vi.fn(async () => {})
    const lock = usePresetLock(ref([generic(1)]))
    lock.showClearDialog.value = true

    await lock.confirmClearPreset(reload)

    expect(clearSpeakerPreset).toHaveBeenCalledTimes(1)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(lock.showClearDialog.value).toBe(false)
  })

  it('does not reload or claim success when the clear fails', async () => {
    clearSpeakerPreset.mockRejectedValue(new Error('dsp busy'))
    const reload = vi.fn(async () => {})
    const lock = usePresetLock(ref([generic(1)]))
    lock.showClearDialog.value = true

    await lock.confirmClearPreset(reload)

    expect(reload).not.toHaveBeenCalled()
    expect(lock.isClearing.value).toBe(false)
  })
})
