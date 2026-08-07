import { describe, it, expect, vi, beforeEach } from 'vitest'

const { setFilterBank, setBiquadFilter, BankEndpointUnavailableError } = vi.hoisted(() => {
  class BankEndpointUnavailableError extends Error {
    constructor() {
      super('unavailable')
      this.name = 'BankEndpointUnavailableError'
    }
  }
  return { setFilterBank: vi.fn(), setBiquadFilter: vi.fn(), BankEndpointUnavailableError }
})

vi.mock('@/api/dsptoolkit', () => ({
  setFilterBank,
  setBiquadFilter,
  BankEndpointUnavailableError,
  getMetadata: vi.fn(),
  getStoredFilters: vi.fn(),
  getDSPProgramChecksum: vi.fn(async () => ({ checksum: 'TESTCHECKSUM' })),
  storeFilters: vi.fn(async () => ({ status: 'success' })),
}))

import { DSPToolkitFilterBackend } from '@/stores/dsp_toolkit_filter_backend'

const BANK = 'left'
const METADATA_KEY = 'customFilterRegisterBankLeft'
const MAX_FILTERS = 16

const seedBackend = () => {
  const backend = new DSPToolkitFilterBackend()
  // @ts-expect-error -- private state, seeded on purpose
  backend.initialize = async () => {}
  // @ts-expect-error -- private state, seeded on purpose
  backend.filterBanks = {
    [BANK]: { name: BANK, filters: [], maxFilters: MAX_FILTERS, metadataKey: METADATA_KEY },
  }
  // @ts-expect-error -- private state, seeded on purpose
  backend.metadata = { _system: { sampleRate: 48000 } }
  return backend
}

const peak = (f: number) => ({ type: 'peak' as const, frequency: f, gain: -3, q: 1 })

/**
 * A filter the DSP cannot render used to become a transparent pass-through
 * with only a console.warn: the EQ curve showed it, the write returned 200,
 * and nothing was audible. Silent wrongness is the defect class this whole
 * plan exists to remove, so these conversions must fail loudly.
 */
describe('unwritable filter types are refused, not silently neutered', () => {
  beforeEach(() => {
    setFilterBank.mockReset().mockResolvedValue({ status: 'success', written: MAX_FILTERS, total: MAX_FILTERS })
    setBiquadFilter.mockReset().mockResolvedValue({ status: 'success' })
  })

  it.each(['bandpass', 'bandstop', 'allpass'])(
    'refuses to write a %s filter the DSP profile cannot render', async (type) => {
      const backend = seedBackend()
      const filters = [peak(100), { type, frequency: 500, gain: -3, q: 1 }]

      await expect(backend.setBankFilters(BANK, filters as never))
        .rejects.toThrow(new RegExp(`not supported.*${type}|${type}.*not supported`, 'i'))
    })

  it('refuses an unrecognised filter type and names it in the message', async () => {
    const backend = seedBackend()
    const filters = [{ type: 'notARealType', frequency: 500, gain: -3, q: 1 }]

    await expect(backend.setBankFilters(BANK, filters as never))
      .rejects.toThrow(/notARealType/)
  })

  it('writes nothing at all when any filter in the bank is unwritable', async () => {
    const backend = seedBackend()
    const filters = [peak(100), peak(200), { type: 'allpass', frequency: 500, gain: -3, q: 1 }]

    await expect(backend.setBankFilters(BANK, filters as never)).rejects.toThrow()

    expect(setFilterBank).not.toHaveBeenCalled()
    expect(setBiquadFilter).not.toHaveBeenCalled()
  })

  it('writes nothing when an unwritable filter is present, before the endpoint is even tried', async () => {
    // setBankFilters converts the whole bank while building its slots array,
    // before setFilterBank is ever called -- so a bad filter never reaches
    // the bulk endpoint or the per-slot fallback either.
    const backend = seedBackend()
    const filters = [peak(100), peak(200), { type: 'allpass', frequency: 500, gain: -3, q: 1 }]

    await expect(backend.setBankFilters(BANK, filters as never)).rejects.toThrow()

    expect(setBiquadFilter).not.toHaveBeenCalled()
  })

  it('writes nothing when a stale unconvertible filter is already in the bank', async () => {
    // updateFilter re-converts the WHOLE bank, so a legacy bandpass sitting in
    // slot 2 must abort the write before slot 0 reaches the hardware. With the
    // conversion back inside the write loop, slots 0 and 1 would already be
    // written when slot 2 threw -- a half-applied bank.
    const backend = seedBackend()
    // @ts-expect-error -- seeding a bank that already holds an unwritable filter
    backend.filterBanks[BANK].filters = [
      { ...peak(100), id: 'a' },
      { ...peak(200), id: 'b' },
      { type: 'bandpass', frequency: 500, gain: -3, q: 1, id: 'c' },
    ]

    await expect(backend.updateFilter(BANK, 0, { frequency: 150 })).rejects.toThrow(/bandpass/)

    expect(setBiquadFilter).not.toHaveBeenCalled()
  })

  it('still writes a bank of entirely supported filters', async () => {
    const backend = seedBackend()

    await backend.setBankFilters(BANK, [peak(100), peak(200)])

    expect(setFilterBank).toHaveBeenCalledTimes(1)
  })
})
