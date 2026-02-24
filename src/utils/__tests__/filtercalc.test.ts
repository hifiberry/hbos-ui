import { describe, it, expect } from 'vitest'
import {
  calculateFilterGain,
  calculateFrequencyResponse,
  calculateSingleFilterResponse,
  type Filter,
} from '../filtercalc'

const SAMPLE_RATE = 48000

const peakingFilter: Filter = {
  id: 1,
  icon: 'peaking',
  text: '1000',
  frequency: 1000,
  gain: 6,
  Q: 1.0,
  enabled: true,
}

describe('calculateFilterGain', () => {
  it('returns 0 for disabled filters', () => {
    const disabled = { ...peakingFilter, enabled: false }
    expect(calculateFilterGain(1000, disabled, SAMPLE_RATE)).toBe(0)
  })

  it('returns positive gain at center frequency for boost', () => {
    const gain = calculateFilterGain(1000, peakingFilter, SAMPLE_RATE)
    expect(gain).toBeGreaterThan(0)
  })

  it('returns negative gain at center frequency for cut', () => {
    const cutFilter = { ...peakingFilter, gain: -6 }
    const gain = calculateFilterGain(1000, cutFilter, SAMPLE_RATE)
    expect(gain).toBeLessThan(0)
  })

  it('works with generic_normalized filters', () => {
    const generic: Filter = {
      id: 2,
      icon: 'generic_normalized',
      text: 'generic',
      frequency: 1000,
      gain: 0,
      Q: 1.0,
      enabled: true,
      genericCoeffs: { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 },
    }
    const gain = calculateFilterGain(1000, generic, SAMPLE_RATE)
    expect(gain).toBeCloseTo(0, 1) // unity filter = 0 dB
  })
})

describe('calculateFrequencyResponse', () => {
  it('returns logarithmically spaced points', () => {
    const points = calculateFrequencyResponse([peakingFilter], 20, 20000, 10, SAMPLE_RATE)
    expect(points.length).toBeGreaterThan(0)

    // Check log spacing: ratio between consecutive frequencies should be roughly constant
    const ratio1 = points[1].frequency / points[0].frequency
    const ratio2 = points[2].frequency / points[1].frequency
    expect(ratio1).toBeCloseTo(ratio2, 3)
  })

  it('returns all-zero gains when all filters are disabled', () => {
    const disabled = { ...peakingFilter, enabled: false }
    const points = calculateFrequencyResponse([disabled], 20, 20000, 10, SAMPLE_RATE)
    for (const point of points) {
      expect(point.gain).toBe(0)
    }
  })

  it('sums gain from multiple filters', () => {
    const filter1 = { ...peakingFilter, frequency: 500 }
    const filter2 = { ...peakingFilter, frequency: 5000 }

    const combined = calculateFrequencyResponse([filter1, filter2], 20, 20000, 10, SAMPLE_RATE)
    const single1 = calculateFrequencyResponse([filter1], 20, 20000, 10, SAMPLE_RATE)
    const single2 = calculateFrequencyResponse([filter2], 20, 20000, 10, SAMPLE_RATE)

    // At each frequency, the combined response should equal the sum of individual responses
    for (let i = 0; i < combined.length; i++) {
      expect(combined[i].gain).toBeCloseTo(single1[i].gain + single2[i].gain, 5)
    }
  })
})

describe('calculateSingleFilterResponse', () => {
  it('returns same result as calculateFrequencyResponse with one filter', () => {
    const single = calculateSingleFilterResponse(peakingFilter, 20, 20000, 10, SAMPLE_RATE)
    const multi = calculateFrequencyResponse([peakingFilter], 20, 20000, 10, SAMPLE_RATE)

    expect(single.length).toBe(multi.length)
    for (let i = 0; i < single.length; i++) {
      expect(single[i].frequency).toBeCloseTo(multi[i].frequency, 5)
      expect(single[i].gain).toBeCloseTo(multi[i].gain, 5)
    }
  })
})
