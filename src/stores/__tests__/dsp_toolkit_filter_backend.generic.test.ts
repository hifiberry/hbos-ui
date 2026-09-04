import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getStoredFilters } = vi.hoisted(() => ({ getStoredFilters: vi.fn() }))

vi.mock('@/api/dsptoolkit', () => ({
  getStoredFilters,
  setFilterBank: vi.fn(),
  setBiquadFilter: vi.fn(async () => ({ status: 'success' })),
  BankEndpointUnavailableError: class extends Error {},
  getMetadata: vi.fn(),
  getDSPProgramChecksum: vi.fn(async () => ({ checksum: 'TESTCHECKSUM' })),
  storeFilters: vi.fn(async () => ({ status: 'success' })),
}))

import { DSPToolkitFilterBackend, isTransparentBiquad } from '@/stores/dsp_toolkit_filter_backend'

const BANK = 'iir_a'
const ADDRESS = 'IIR_A'
const MAX_FILTERS = 16

/** The pass-through the firmware writes into an unused slot. */
const TRANSPARENT = { a0: 1.0, a1: 0.0, a2: 0.0, b0: 1.0, b1: 0.0, b2: 0.0 }

/** One band of a real speaker preset, as raw coefficients. */
const presetBand = (b0: number) => ({
  a0: 1.0, a1: -1.9, a2: 0.9, b0, b1: -1.8, b2: 0.85,
})

const seedBackend = () => {
  const backend = new DSPToolkitFilterBackend()
  // @ts-expect-error -- private state, seeded on purpose
  backend.filterBanks = {
    [BANK]: { name: BANK, filters: [], maxFilters: MAX_FILTERS, metadataKey: ADDRESS },
  }
  // @ts-expect-error -- private state, seeded on purpose
  backend.metadata = { _system: { sampleRate: 48000 } }
  return backend
}

/** Drive the private loader the initialisation path uses. */
const loadStored = async (backend: DSPToolkitFilterBackend) => {
  // @ts-expect-error -- private method, exercised on purpose
  await backend.loadStoredFilters()
  // @ts-expect-error -- private state, read on purpose
  return backend.filterBanks[BANK].filters
}

const storedBank = (filters: object[]) => ({
  checksum: 'TESTCHECKSUM',
  filters: Object.fromEntries(
    filters.map((filter, offset) => [`${ADDRESS}_${offset}`, { address: ADDRESS, offset, filter }]),
  ),
})

describe('isTransparentBiquad', () => {
  it('recognises the firmware pass-through', () => {
    expect(isTransparentBiquad(TRANSPARENT)).toBe(true)
  })

  it('tolerates the drift of a fixed-point round trip', () => {
    // 8.24 resolves to ~6e-8: a pass-through comes back very slightly off.
    expect(isTransparentBiquad({
      a0: 1.0, a1: -5.96e-8, a2: 0.0, b0: 0.99999994, b1: 5.96e-8, b2: 0.0,
    })).toBe(true)
  })

  it('does not swallow a real filter that happens to be gentle', () => {
    expect(isTransparentBiquad({ a0: 1.0, a1: -0.001, a2: 0.0, b0: 1.0, b1: 0.0, b2: 0.0 }))
      .toBe(false)
  })

  it('normalises by a0 before judging', () => {
    expect(isTransparentBiquad({ a0: 2.0, a1: 0.0, a2: 0.0, b0: 2.0, b1: 0.0, b2: 0.0 }))
      .toBe(true)
  })
})

describe('raw-coefficient filters reach the editor', () => {
  beforeEach(() => {
    getStoredFilters.mockReset()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('turns a raw-coefficient stored filter into a generic filter carrying its coefficients', async () => {
    getStoredFilters.mockResolvedValue(storedBank([presetBand(0.87)]))

    const filters = await loadStored(seedBackend())

    expect(filters).toHaveLength(1)
    expect(filters[0].type).toBe('generic')
    expect(filters[0].coefficients).toEqual({
      b0: 0.87, b1: -1.8, b2: 0.85, a1: -1.9, a2: 0.9,
    })
  })

  it('treats a transparent biquad as an empty slot, not a filter', async () => {
    getStoredFilters.mockResolvedValue(storedBank([TRANSPARENT]))

    expect(await loadStored(seedBackend())).toHaveLength(0)
  })

  it('reports a bank of 9 real filters and 7 transparent ones as 9, not 16', async () => {
    const bands = Array.from({ length: 9 }, (_, i) => presetBand(0.8 + i / 100))
    const empties = Array.from({ length: 7 }, () => ({ ...TRANSPARENT }))
    getStoredFilters.mockResolvedValue(storedBank([...bands, ...empties]))

    const backend = seedBackend()
    const filters = await loadStored(backend)

    expect(filters).toHaveLength(9)
    expect(filters.every((f: { type: string }) => f.type === 'generic')).toBe(true)
  })

  it('leaves a cleared bank empty rather than locked behind imaginary filters', async () => {
    // What the device looks like right after DELETE /presets/current: every
    // slot a pass-through. Reading these back as generic filters would lock
    // the editor permanently.
    getStoredFilters.mockResolvedValue(
      storedBank(Array.from({ length: MAX_FILTERS }, () => ({ ...TRANSPARENT }))),
    )

    expect(await loadStored(seedBackend())).toHaveLength(0)
  })

  it('still reconstructs typed filters exactly as before', async () => {
    getStoredFilters.mockResolvedValue(
      storedBank([{ type: 'PeakingEq', f: 120, db: -4, q: 2 }]),
    )

    const filters = await loadStored(seedBackend())

    expect(filters[0]).toMatchObject({ type: 'peak', frequency: 120, gain: -4, q: 2 })
  })
})

describe('generic filters are written back as the coefficients they are', () => {
  it('sends raw coefficients, not a typed filter at some invented frequency', async () => {
    const backend = seedBackend()
    // @ts-expect-error -- private method, exercised on purpose
    const dspFilter = backend.convertFilterToDSPFormat({
      id: 'x', type: 'generic', frequency: 0, enabled: true,
      coefficients: { b0: 0.87, b1: -1.8, b2: 0.85, a1: -1.9, a2: 0.9 },
    })

    expect(dspFilter).toEqual({ a0: 1.0, a1: -1.9, a2: 0.9, b0: 0.87, b1: -1.8, b2: 0.85 })
  })

  it('refuses a generic filter with no coefficients rather than writing a pass-through', async () => {
    const backend = seedBackend()

    expect(() => {
      // @ts-expect-error -- private method, exercised on purpose
      backend.convertFilterToDSPFormat({ id: 'x', type: 'generic', frequency: 0, enabled: true })
    }).toThrow(/coefficients/)
  })
})
