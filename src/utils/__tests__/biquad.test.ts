import { describe, it, expect } from 'vitest'
import {
  calculateBiquadCoefficients,
  calculateBiquadResponse,
  calculateBiquadGainDB,
  calculateBiquadFrequencyResponse,
  createBiquadFilter,
  createGenericNormalizedBiquad,
  validateBiquadFilter,
  qToBandwidth,
  bandwidthToQ,
  calculateBiquadBandwidth,
  FILTER_TYPES,
  type BiquadFilter,
} from '../biquad'

const SAMPLE_RATE = 48000

describe('createBiquadFilter', () => {
  it('creates a filter with given parameters', () => {
    const filter = createBiquadFilter('peaking', 1000, 6, 1.0, SAMPLE_RATE)
    expect(filter.type).toBe('peaking')
    expect(filter.frequency).toBe(1000)
    expect(filter.gain).toBe(6)
    expect(filter.Q).toBe(1.0)
    expect(filter.sampleRate).toBe(SAMPLE_RATE)
  })

  it('defaults sample rate to 48000', () => {
    const filter = createBiquadFilter('lowpass', 500, 0, 0.707)
    expect(filter.sampleRate).toBe(48000)
  })
})

describe('createGenericNormalizedBiquad', () => {
  it('creates a generic normalized filter', () => {
    const filter = createGenericNormalizedBiquad(1.0, -1.5, 0.8, -1.2, 0.6, SAMPLE_RATE)
    expect(filter.type).toBe(FILTER_TYPES.GENERIC_NORMALIZED)
    expect(filter.genericCoeffs).toEqual({
      b0: 1.0,
      b1: -1.5,
      b2: 0.8,
      a1: -1.2,
      a2: 0.6,
    })
  })
})

describe('calculateBiquadCoefficients', () => {
  it('normalizes coefficients so a0 = 1', () => {
    const filter = createBiquadFilter('lowpass', 1000, 0, 0.707, SAMPLE_RATE)
    const coeffs = calculateBiquadCoefficients(filter)
    expect(coeffs.a0).toBe(1)
  })

  it('produces finite coefficients for all standard filter types', () => {
    const types: Array<BiquadFilter['type']> = ['lowpass', 'highpass', 'peaking', 'lowshelf', 'highshelf']
    for (const type of types) {
      const filter = createBiquadFilter(type, 1000, 6, 1.0, SAMPLE_RATE)
      const coeffs = calculateBiquadCoefficients(filter)
      expect(isFinite(coeffs.b0), `${type} b0`).toBe(true)
      expect(isFinite(coeffs.b1), `${type} b1`).toBe(true)
      expect(isFinite(coeffs.b2), `${type} b2`).toBe(true)
      expect(isFinite(coeffs.a1), `${type} a1`).toBe(true)
      expect(isFinite(coeffs.a2), `${type} a2`).toBe(true)
    }
  })

  it('uses provided coefficients for generic_normalized', () => {
    const filter = createGenericNormalizedBiquad(1.0, 0.5, 0.25, -0.5, 0.25, SAMPLE_RATE)
    const coeffs = calculateBiquadCoefficients(filter)
    expect(coeffs.b0).toBe(1.0)
    expect(coeffs.b1).toBe(0.5)
    expect(coeffs.b2).toBe(0.25)
    expect(coeffs.a0).toBe(1)
    expect(coeffs.a1).toBe(-0.5)
    expect(coeffs.a2).toBe(0.25)
  })

  it('throws for generic_normalized without coefficients', () => {
    const filter: BiquadFilter = {
      type: 'generic_normalized',
      frequency: 1000,
      gain: 0,
      Q: 1,
      sampleRate: SAMPLE_RATE,
    }
    expect(() => calculateBiquadCoefficients(filter)).toThrow('genericCoeffs')
  })
})

describe('calculateBiquadResponse', () => {
  it('returns magnitude 1 and phase 0 for unity filter at DC-like frequency', () => {
    // Unity filter: b0=1, b1=0, b2=0, a0=1, a1=0, a2=0
    const coeffs = { b0: 1, b1: 0, b2: 0, a0: 1, a1: 0, a2: 0 }
    const response = calculateBiquadResponse(coeffs, 100, SAMPLE_RATE)
    expect(response.magnitude).toBeCloseTo(1, 5)
    expect(response.phase).toBeCloseTo(0, 5)
  })
})

describe('calculateBiquadGainDB', () => {
  it('returns ~0 dB for a flat peaking filter (0 dB gain)', () => {
    const filter = createBiquadFilter('peaking', 1000, 0, 1.0, SAMPLE_RATE)
    const gain = calculateBiquadGainDB(filter, 1000)
    expect(gain).toBeCloseTo(0, 1)
  })

  it('returns positive dB at center frequency for peaking boost', () => {
    const filter = createBiquadFilter('peaking', 1000, 12, 1.0, SAMPLE_RATE)
    const gain = calculateBiquadGainDB(filter, 1000)
    expect(gain).toBeGreaterThan(0)
    expect(gain).toBeCloseTo(12, 0) // approximately the set gain
  })

  it('returns negative dB at center frequency for peaking cut', () => {
    const filter = createBiquadFilter('peaking', 1000, -12, 1.0, SAMPLE_RATE)
    const gain = calculateBiquadGainDB(filter, 1000)
    expect(gain).toBeLessThan(0)
  })

  it('lowpass attenuates frequencies above cutoff', () => {
    const filter = createBiquadFilter('lowpass', 1000, 0, 0.707, SAMPLE_RATE)
    const gainAtCutoff = calculateBiquadGainDB(filter, 1000)
    const gainAbove = calculateBiquadGainDB(filter, 10000)
    expect(gainAbove).toBeLessThan(gainAtCutoff)
  })

  it('highpass attenuates frequencies below cutoff', () => {
    const filter = createBiquadFilter('highpass', 1000, 0, 0.707, SAMPLE_RATE)
    const gainAtCutoff = calculateBiquadGainDB(filter, 1000)
    const gainBelow = calculateBiquadGainDB(filter, 100)
    expect(gainBelow).toBeLessThan(gainAtCutoff)
  })
})

describe('calculateBiquadFrequencyResponse', () => {
  it('returns array with correct length', () => {
    const filter = createBiquadFilter('peaking', 1000, 6, 1.0, SAMPLE_RATE)
    const freqs = [100, 500, 1000, 5000, 10000]
    const response = calculateBiquadFrequencyResponse(filter, freqs)
    expect(response).toHaveLength(5)
  })

  it('includes frequency and gain for each point', () => {
    const filter = createBiquadFilter('peaking', 1000, 6, 1.0, SAMPLE_RATE)
    const response = calculateBiquadFrequencyResponse(filter, [1000])
    expect(response[0]).toHaveProperty('frequency', 1000)
    expect(response[0]).toHaveProperty('gainDB')
    expect(response[0]).toHaveProperty('phase')
  })
})

describe('validateBiquadFilter', () => {
  it('validates a correct standard filter', () => {
    const filter = createBiquadFilter('peaking', 1000, 6, 1.0, SAMPLE_RATE)
    expect(validateBiquadFilter(filter)).toBe(true)
  })

  it('rejects frequency at or above Nyquist', () => {
    const filter = createBiquadFilter('peaking', 24000, 6, 1.0, SAMPLE_RATE)
    expect(validateBiquadFilter(filter)).toBe(false)
  })

  it('rejects zero frequency', () => {
    const filter = createBiquadFilter('peaking', 0, 6, 1.0, SAMPLE_RATE)
    expect(validateBiquadFilter(filter)).toBe(false)
  })

  it('rejects negative frequency', () => {
    const filter = createBiquadFilter('peaking', -100, 6, 1.0, SAMPLE_RATE)
    expect(validateBiquadFilter(filter)).toBe(false)
  })

  it('rejects zero Q', () => {
    const filter = createBiquadFilter('peaking', 1000, 6, 0, SAMPLE_RATE)
    expect(validateBiquadFilter(filter)).toBe(false)
  })

  it('rejects non-finite gain', () => {
    const filter = createBiquadFilter('peaking', 1000, Infinity, 1.0, SAMPLE_RATE)
    expect(validateBiquadFilter(filter)).toBe(false)
  })

  it('validates a correct generic_normalized filter', () => {
    const filter = createGenericNormalizedBiquad(1, -0.5, 0.25, -0.5, 0.25, SAMPLE_RATE)
    expect(validateBiquadFilter(filter)).toBe(true)
  })

  it('rejects generic_normalized without coefficients', () => {
    const filter: BiquadFilter = {
      type: 'generic_normalized',
      frequency: 1000,
      gain: 0,
      Q: 1,
      sampleRate: SAMPLE_RATE,
    }
    expect(validateBiquadFilter(filter)).toBe(false)
  })

  it('rejects generic_normalized with non-finite coefficients', () => {
    const filter = createGenericNormalizedBiquad(NaN, 0, 0, 0, 0, SAMPLE_RATE)
    expect(validateBiquadFilter(filter)).toBe(false)
  })
})

describe('qToBandwidth / bandwidthToQ roundtrip', () => {
  it('roundtrips Q -> bandwidth -> Q', () => {
    const freq = 1000
    const omega0 = (2 * Math.PI * freq) / SAMPLE_RATE
    const originalQ = 1.5

    const bandwidth = qToBandwidth(originalQ, omega0)
    const recoveredQ = bandwidthToQ(bandwidth, omega0)

    expect(recoveredQ).toBeCloseTo(originalQ, 5)
  })

  it('higher Q means narrower bandwidth', () => {
    const omega0 = (2 * Math.PI * 1000) / SAMPLE_RATE
    const bwLowQ = qToBandwidth(0.5, omega0)
    const bwHighQ = qToBandwidth(4.0, omega0)
    expect(bwHighQ).toBeLessThan(bwLowQ)
  })
})

describe('calculateBiquadBandwidth', () => {
  it('returns lower and upper frequency for peaking filter', () => {
    const filter = createBiquadFilter('peaking', 1000, 6, 1.0, SAMPLE_RATE)
    const bw = calculateBiquadBandwidth(filter)
    expect(bw).not.toBeNull()
    expect(bw!.lowerFreq).toBeLessThan(1000)
    expect(bw!.upperFreq).toBeGreaterThan(1000)
  })

  it('returns null for invalid Q', () => {
    const filter = createBiquadFilter('peaking', 1000, 6, 0, SAMPLE_RATE)
    expect(calculateBiquadBandwidth(filter)).toBeNull()
  })

  it('returns null for invalid frequency', () => {
    const filter = createBiquadFilter('peaking', 0, 6, 1.0, SAMPLE_RATE)
    expect(calculateBiquadBandwidth(filter)).toBeNull()
  })

  it('clamps lower frequency to 1 Hz minimum', () => {
    const filter = createBiquadFilter('lowpass', 5, 0, 0.1, SAMPLE_RATE)
    const bw = calculateBiquadBandwidth(filter)
    if (bw) {
      expect(bw.lowerFreq).toBeGreaterThanOrEqual(1)
    }
  })

  it('clamps upper frequency to Nyquist', () => {
    const filter = createBiquadFilter('highpass', 20000, 0, 0.1, SAMPLE_RATE)
    const bw = calculateBiquadBandwidth(filter)
    if (bw) {
      expect(bw.upperFreq).toBeLessThanOrEqual(SAMPLE_RATE / 2)
    }
  })
})
