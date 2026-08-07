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

  it('writes nothing on the fallback path either when a filter is unwritable', async () => {
    // The per-slot fallback writes to live registers one at a time. Converting
    // every filter before the first write is what stops a bad filter halfway
    // down the bank from leaving the first half applied.
    const backend = seedBackend()
    setFilterBank.mockRejectedValue(new BankEndpointUnavailableError())
    const filters = [peak(100), peak(200), { type: 'allpass', frequency: 500, gain: -3, q: 1 }]

    await expect(backend.setBankFilters(BANK, filters as never)).rejects.toThrow()

    expect(setBiquadFilter).not.toHaveBeenCalled()
  })

  it('still writes a bank of entirely supported filters', async () => {
    const backend = seedBackend()

    await backend.setBankFilters(BANK, [peak(100), peak(200)])

    expect(setFilterBank).toHaveBeenCalledTimes(1)
  })
})
