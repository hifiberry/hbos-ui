import { describe, it, expect, vi, beforeEach } from 'vitest'

// `vi.mock` factories run before the rest of this file's top-level statements
// (real ESM module evaluation order), so anything the factory closes over
// must come from `vi.hoisted()` rather than a plain `const`/`class` below --
// otherwise this throws a TDZ ReferenceError instead of exercising the code
// under test.
const { setFilterBank, setBiquadFilter, BankEndpointUnavailableError } = vi.hoisted(() => {
  class BankEndpointUnavailableError extends Error {
    constructor() {
      super('unavailable')
      this.name = 'BankEndpointUnavailableError'
    }
  }
  return {
    setFilterBank: vi.fn(),
    setBiquadFilter: vi.fn(),
    BankEndpointUnavailableError,
  }
})

vi.mock('@/api/dsptoolkit', () => ({
  setFilterBank: (...args: unknown[]) => setFilterBank(...args),
  setBiquadFilter: (...args: unknown[]) => setBiquadFilter(...args),
  BankEndpointUnavailableError,
  getMetadata: vi.fn(),
  getStoredFilters: vi.fn(),
}))

import { DSPToolkitFilterBackend } from '@/stores/dsp_toolkit_filter_backend'

const BANK = 'left'
const METADATA_KEY = 'customFilterRegisterBankLeft'
const MAX_FILTERS = 16

const peaking = (f: number) => ({ type: 'PeakingEq' as const, frequency: f, gain: -3, q: 1 })

/**
 * The backend caches its bank layout in `filterBanks` after initialize().
 * Seeding it directly keeps this test focused on the write path rather than on
 * metadata parsing, which has its own coverage.
 */
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

describe('DSPToolkitFilterBackend.setBankFilters', () => {
  beforeEach(() => {
    setFilterBank.mockReset()
    setBiquadFilter.mockReset()
    setFilterBank.mockResolvedValue({ status: 'success', written: MAX_FILTERS, total: MAX_FILTERS })
    setBiquadFilter.mockResolvedValue({ status: 'success' })
  })

  it('writes a 16-filter correction with ONE request, not 136', async () => {
    const backend = seedBackend()
    const filters = Array.from({ length: 16 }, (_, i) => peaking(100 * (i + 1)))

    await backend.setBankFilters(BANK, filters)

    expect(setFilterBank).toHaveBeenCalledTimes(1)
    expect(setBiquadFilter).not.toHaveBeenCalled()
  })

  it('sends every slot of the bank, padding unused slots with a transparent biquad', async () => {
    const backend = seedBackend()

    await backend.setBankFilters(BANK, [peaking(100), peaking(200)])

    const request = setFilterBank.mock.calls[0][0]
    expect(request.address).toBe(METADATA_KEY)
    expect(request.filters).toHaveLength(MAX_FILTERS)
    expect(request.filters[0].offset).toBe(0)
    expect(request.filters[15]).toEqual({
      offset: 15,
      filter: { a0: 1, a1: 0, a2: 0, b0: 1, b1: 0, b2: 0 },
    })
  })

  it('leaves the in-memory bank matching what was written', async () => {
    const backend = seedBackend()

    await backend.setBankFilters(BANK, [peaking(100), peaking(200)])

    const config = await backend.exportFilterConfig()
    expect(config[BANK].filters).toHaveLength(2)
    expect(config[BANK].filters[0].frequency).toBe(100)
  })

  it('falls back to per-slot writes when the device has no bank endpoint', async () => {
    const backend = seedBackend()
    setFilterBank.mockRejectedValue(new BankEndpointUnavailableError())

    await backend.setBankFilters(BANK, [peaking(100), peaking(200)])

    expect(setBiquadFilter).toHaveBeenCalled()
    expect(setBiquadFilter.mock.calls.length).toBeGreaterThanOrEqual(MAX_FILTERS)
  })

  it('propagates a real write failure instead of reporting success', async () => {
    const backend = seedBackend()
    setFilterBank.mockRejectedValue(new Error('Filter bank only partially written (15/16)'))

    await expect(backend.setBankFilters(BANK, [peaking(100)])).rejects.toThrow(/partially written/)
  })
})
