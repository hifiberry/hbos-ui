import { describe, it, expect } from 'vitest'
import { convertUIFilterToStore, convertStoreFilterToUI } from '../filter-conversions'
import type { Filter as UIFilter } from '../filtercalc'
import type { Filter as StoreFilter } from '@/stores/filter_backend_interface'

describe('convertUIFilterToStore', () => {
  const baseUIFilter: UIFilter = {
    id: 1,
    kind: 'peaking',
    text: '1000',
    frequency: 1000,
    gain: 3.5,
    Q: 1.2,
    enabled: true,
  }

  it('converts peaking filter type', () => {
    const result = convertUIFilterToStore(baseUIFilter)
    expect(result.type).toBe('peak')
    expect(result.frequency).toBe(1000)
    expect(result.gain).toBe(3.5)
    expect(result.q).toBe(1.2)
    expect(result.enabled).toBe(true)
  })

  it('converts lowshelf to shelf-low', () => {
    const result = convertUIFilterToStore({ ...baseUIFilter, kind: 'lowshelf' })
    expect(result.type).toBe('shelf-low')
  })

  it('converts highshelf to shelf-high', () => {
    const result = convertUIFilterToStore({ ...baseUIFilter, kind: 'highshelf' })
    expect(result.type).toBe('shelf-high')
  })

  it('converts highpass', () => {
    const result = convertUIFilterToStore({ ...baseUIFilter, kind: 'highpass' })
    expect(result.type).toBe('highpass')
  })

  it('converts lowpass', () => {
    const result = convertUIFilterToStore({ ...baseUIFilter, kind: 'lowpass' })
    expect(result.type).toBe('lowpass')
  })

  it('refuses an unrecognised UI filter kind instead of silently making it a peak filter', () => {
    expect(() => convertUIFilterToStore({
      id: 1, kind: 'notARealIcon', text: '1000', frequency: 1000,
      gain: -3, Q: 1, enabled: true,
    } as never)).toThrow(/notARealIcon/)
  })

  it('does not include id in result', () => {
    const result = convertUIFilterToStore(baseUIFilter)
    expect(result).not.toHaveProperty('id')
  })

  it('converts a generic biquad to a generic store filter carrying its coefficients', () => {
    const result = convertUIFilterToStore({
      ...baseUIFilter,
      kind: 'generic_normalized',
      genericCoeffs: { b0: 0.87, b1: -1.8, b2: 0.85, a1: -1.9, a2: 0.9 },
    })

    expect(result.type).toBe('generic')
    expect(result.coefficients).toEqual({ b0: 0.87, b1: -1.8, b2: 0.85, a1: -1.9, a2: 0.9 })
  })
})

describe('round-tripping a generic biquad', () => {
  /**
   * The old mapping degraded a preset's biquad into a peak filter at whatever
   * frequency happened to be on the object — a silent change to what the
   * speaker plays.
   */
  it('preserves the coefficients instead of degrading into a peak filter', () => {
    const coefficients = { b0: 0.87, b1: -1.8, b2: 0.85, a1: -1.9, a2: 0.9 }
    const uiFilter: UIFilter = {
      id: 4,
      kind: 'generic_normalized',
      text: '0',
      frequency: 0,
      gain: 0,
      Q: 0.71,
      enabled: true,
      genericCoeffs: coefficients,
    }

    const stored = convertUIFilterToStore(uiFilter)
    const roundTripped = convertStoreFilterToUI({ ...stored, id: 'filter_4' }, 'filter_4')

    expect(roundTripped.kind).toBe('generic_normalized')
    expect(roundTripped.genericCoeffs).toEqual(coefficients)
  })

  it('does not alias the coefficient object between the two representations', () => {
    const uiFilter: UIFilter = {
      id: 4,
      kind: 'generic_normalized',
      text: '0',
      frequency: 0,
      gain: 0,
      Q: 0.71,
      enabled: true,
      genericCoeffs: { b0: 1.2, b1: 0, b2: 0, a1: 0, a2: 0 },
    }

    const stored = convertUIFilterToStore(uiFilter)
    uiFilter.genericCoeffs!.b0 = 99

    expect(stored.coefficients?.b0).toBe(1.2)
  })
})

describe('convertStoreFilterToUI', () => {
  const baseStoreFilter: StoreFilter = {
    id: 'filter_3',
    type: 'peak',
    frequency: 2000,
    gain: -2.5,
    q: 0.8,
    enabled: true,
  }

  it('converts peak filter to UI format', () => {
    const result = convertStoreFilterToUI(baseStoreFilter, 'filter_3')
    expect(result.id).toBe(3)
    expect(result.kind).toBe('peaking')
    expect(result.text).toBe('2000')
    expect(result.frequency).toBe(2000)
    expect(result.gain).toBe(-2.5)
    expect(result.Q).toBe(0.8)
    expect(result.enabled).toBe(true)
  })

  it('converts shelf-low to the lowshelf kind', () => {
    const result = convertStoreFilterToUI({ ...baseStoreFilter, type: 'shelf-low' }, 'filter_0')
    expect(result.kind).toBe('lowshelf')
  })

  it('converts shelf-high to the highshelf kind', () => {
    const result = convertStoreFilterToUI({ ...baseStoreFilter, type: 'shelf-high' }, 'filter_1')
    expect(result.kind).toBe('highshelf')
  })

  it('parses id from filter string', () => {
    expect(convertStoreFilterToUI(baseStoreFilter, 'filter_5').id).toBe(5)
    expect(convertStoreFilterToUI(baseStoreFilter, 'filter_0').id).toBe(0)
    expect(convertStoreFilterToUI(baseStoreFilter, 'filter_12').id).toBe(12)
  })

  it('returns 0 for unparseable id', () => {
    expect(convertStoreFilterToUI(baseStoreFilter, 'badformat').id).toBe(0)
  })

  it('defaults gain to 0 when undefined', () => {
    const filter = { ...baseStoreFilter, gain: undefined }
    const result = convertStoreFilterToUI(filter as any, 'filter_0')
    expect(result.gain).toBe(0)
  })

  it('defaults Q to 0.71 when undefined', () => {
    const filter = { ...baseStoreFilter, q: undefined }
    const result = convertStoreFilterToUI(filter as any, 'filter_0')
    expect(result.Q).toBe(0.71)
  })

  it('maps a generic store filter back to the generic biquad kind with its coefficients', () => {
    const result = convertStoreFilterToUI(
      {
        id: 'filter_2',
        type: 'generic',
        frequency: 0,
        enabled: true,
        coefficients: { b0: 0.87, b1: -1.8, b2: 0.85, a1: -1.9, a2: 0.9 },
      },
      'filter_2',
    )

    expect(result.kind).toBe('generic_normalized')
    expect(result.genericCoeffs).toEqual({ b0: 0.87, b1: -1.8, b2: 0.85, a1: -1.9, a2: 0.9 })
  })

  it('falls back to the peaking kind for unmapped store types', () => {
    const result = convertStoreFilterToUI(
      { ...baseStoreFilter, type: 'bandpass' },
      'filter_0',
    )
    expect(result.kind).toBe('peaking')
  })
})
