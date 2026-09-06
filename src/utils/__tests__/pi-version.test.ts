import { describe, it, expect } from 'vitest'
import { isPi5OrNewer } from '@/utils/pi-version'

// The strings under test are exactly what configurator's PiModel.version
// emits (configurator/pimodel.py); compute modules carry a "CM" prefix, and
// every other board reports a bare or suffixed number.
describe('isPi5OrNewer', () => {
  it('counts a Compute Module 5 as Pi 5 hardware', () => {
    expect(isPi5OrNewer('CM5')).toBe(true)
  })

  it('accepts a plain Pi 5', () => {
    expect(isPi5OrNewer('5')).toBe(true)
  })

  it('rejects a Compute Module 4', () => {
    expect(isPi5OrNewer('CM4')).toBe(false)
  })

  it('rejects the Pi 4 and every earlier board', () => {
    expect(isPi5OrNewer('4')).toBe(false)
    expect(isPi5OrNewer('3B+')).toBe(false)
    expect(isPi5OrNewer('3A+')).toBe(false)
    expect(isPi5OrNewer('3B')).toBe(false)
    expect(isPi5OrNewer('2')).toBe(false)
  })

  it('rejects the Zero boards, whose numbering does not mean a generation', () => {
    expect(isPi5OrNewer('0W')).toBe(false)
    expect(isPi5OrNewer('02W')).toBe(false)
  })

  it('accepts generations newer than 5, board and compute module alike', () => {
    expect(isPi5OrNewer('6')).toBe(true)
    expect(isPi5OrNewer('CM6')).toBe(true)
  })

  it('rejects hardware it could not identify', () => {
    expect(isPi5OrNewer('unknown')).toBe(false)
    expect(isPi5OrNewer('')).toBe(false)
    expect(isPi5OrNewer(null)).toBe(false)
    expect(isPi5OrNewer(undefined)).toBe(false)
  })
})
