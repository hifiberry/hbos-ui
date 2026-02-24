import { describe, it, expect } from 'vitest'
import { convertUIFilterToStore, convertStoreFilterToUI } from '../filter-conversions'
import type { Filter as UIFilter } from '../filtercalc'
import type { Filter as StoreFilter } from '@/stores/filter_backend_interface'

describe('convertUIFilterToStore', () => {
  const baseUIFilter: UIFilter = {
    id: 1,
    icon: 'peaking',
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
    const result = convertUIFilterToStore({ ...baseUIFilter, icon: 'lowshelf' })
    expect(result.type).toBe('shelf-low')
  })

  it('converts highshelf to shelf-high', () => {
    const result = convertUIFilterToStore({ ...baseUIFilter, icon: 'highshelf' })
    expect(result.type).toBe('shelf-high')
  })

  it('converts highpass', () => {
    const result = convertUIFilterToStore({ ...baseUIFilter, icon: 'highpass' })
    expect(result.type).toBe('highpass')
  })

  it('converts lowpass', () => {
    const result = convertUIFilterToStore({ ...baseUIFilter, icon: 'lowpass' })
    expect(result.type).toBe('lowpass')
  })

  it('falls back to peak for unknown types', () => {
    const result = convertUIFilterToStore({ ...baseUIFilter, icon: 'unknown_type' as any })
    expect(result.type).toBe('peak')
  })

  it('does not include id in result', () => {
    const result = convertUIFilterToStore(baseUIFilter)
    expect(result).not.toHaveProperty('id')
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
    expect(result.icon).toBe('peaking')
    expect(result.text).toBe('2000')
    expect(result.frequency).toBe(2000)
    expect(result.gain).toBe(-2.5)
    expect(result.Q).toBe(0.8)
    expect(result.enabled).toBe(true)
  })

  it('converts shelf-low to lowshelf icon', () => {
    const result = convertStoreFilterToUI({ ...baseStoreFilter, type: 'shelf-low' }, 'filter_0')
    expect(result.icon).toBe('lowshelf')
  })

  it('converts shelf-high to highshelf icon', () => {
    const result = convertStoreFilterToUI({ ...baseStoreFilter, type: 'shelf-high' }, 'filter_1')
    expect(result.icon).toBe('highshelf')
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

  it('falls back to peaking icon for unmapped store types', () => {
    const result = convertStoreFilterToUI(
      { ...baseStoreFilter, type: 'bandpass' },
      'filter_0',
    )
    expect(result.icon).toBe('peaking')
  })
})
