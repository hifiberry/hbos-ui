import { describe, it, expect } from 'vitest'
import { getFilterIconName, formatFilterTypeName } from '../filter-display'
import type { BiquadFilterType } from '../biquad'

describe('getFilterIconName', () => {
  it('maps lowshelf to filter-low-shelf', () => {
    expect(getFilterIconName('lowshelf')).toBe('filter-low-shelf')
  })

  it('maps peaking to filter-peak', () => {
    expect(getFilterIconName('peaking')).toBe('filter-peak')
  })

  it('maps highshelf to filter-high-shelf', () => {
    expect(getFilterIconName('highshelf')).toBe('filter-high-shelf')
  })

  it('maps highpass to filter-high-pass', () => {
    expect(getFilterIconName('highpass')).toBe('filter-high-pass')
  })

  it('maps lowpass to filter-low-pass', () => {
    expect(getFilterIconName('lowpass')).toBe('filter-low-pass')
  })

  it('maps generic_normalized to filter-peak', () => {
    expect(getFilterIconName('generic_normalized')).toBe('filter-peak')
  })

  it('returns filter-peak for unknown types', () => {
    expect(getFilterIconName('unknown' as BiquadFilterType)).toBe('filter-peak')
  })
})

describe('formatFilterTypeName', () => {
  it('formats lowshelf', () => {
    expect(formatFilterTypeName('lowshelf')).toBe('Low\nShelf')
  })

  it('formats peaking', () => {
    expect(formatFilterTypeName('peaking')).toBe('Peaking\nEQ')
  })

  it('formats highshelf', () => {
    expect(formatFilterTypeName('highshelf')).toBe('High\nShelf')
  })

  it('formats generic_normalized', () => {
    expect(formatFilterTypeName('generic_normalized')).toBe('Generic\nBiquad')
  })

  it('returns raw type name for unmapped types', () => {
    expect(formatFilterTypeName('highpass')).toBe('highpass')
    expect(formatFilterTypeName('lowpass')).toBe('lowpass')
  })
})
