/**
 * Biquad filter implementations for standard audio filter types
 * Contains mathematically accurate biquad filter calculations
 *
 * Supports standard filter types (lowpass, highpass, peaking, shelving)
 * and generic normalized filters using direct coefficient specification.
 */

// Filter type constants
export const FILTER_TYPES = {
  LOWPASS: 'lowpass',
  HIGHPASS: 'highpass',
  LOWSHELF: 'lowshelf',
  HIGHSHELF: 'highshelf',
  PEAKING: 'peaking',
  GENERIC_NORMALIZED: 'generic_normalized' // Direct coefficient specification with a0 = 1
} as const;

export type BiquadFilterType = typeof FILTER_TYPES[keyof typeof FILTER_TYPES];

export interface BiquadCoefficients {
  b0: number;
  b1: number;
  b2: number;
  a0: number;
  a1: number;
  a2: number;
}

export interface BiquadFilter {
  type: BiquadFilterType;
  frequency: number;  // Center/cutoff frequency in Hz
  gain: number;       // Gain in dB
  Q: number;          // Q factor
  sampleRate: number; // Sample rate in Hz
  // For generic_normalized filters, provide the 5 coefficients directly
  genericCoeffs?: {
    b0: number;
    b1: number;
    b2: number;
    a1: number;
    a2: number;
    // a0 is always 1 for normalized filters
  };
}

/**
 * Calculate biquad coefficients for a given filter configuration
 */
export function calculateBiquadCoefficients(filter: BiquadFilter): BiquadCoefficients {
  const { type, frequency, gain, Q, sampleRate } = filter;

  // Normalized frequency (0 to π)
  const omega = 2 * Math.PI * frequency / sampleRate;
  const sin = Math.sin(omega);
  const cos = Math.cos(omega);

  // Linear gain factor
  const A = Math.pow(10, gain / 40); // sqrt of linear gain (for shelving filters)
  const alpha = sin / (2 * Q);

  let b0 = 1, b1 = 0, b2 = 0;
  let a0 = 1, a1 = 0, a2 = 0;

  switch (type) {
    case FILTER_TYPES.LOWPASS:
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = (1 - cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
      break;

    case FILTER_TYPES.HIGHPASS:
      b0 = (1 + cos) / 2;
      b1 = -(1 + cos);
      b2 = (1 + cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
      break;

    case FILTER_TYPES.PEAKING:
      const APeaking = Math.pow(10, gain / 40); // A = sqrt(linearGain)

      b0 = 1 + alpha * APeaking;
      b1 = -2 * cos;
      b2 = 1 - alpha * APeaking;
      a0 = 1 + alpha / APeaking;
      a1 = -2 * cos;
      a2 = 1 - alpha / APeaking;
      break;

    case FILTER_TYPES.LOWSHELF:
      const beta = Math.sqrt(A) / Q;

      b0 = A * ((A + 1) - (A - 1) * cos + beta * sin);
      b1 = 2 * A * ((A - 1) - (A + 1) * cos);
      b2 = A * ((A + 1) - (A - 1) * cos - beta * sin);
      a0 = (A + 1) + (A - 1) * cos + beta * sin;
      a1 = -2 * ((A - 1) + (A + 1) * cos);
      a2 = (A + 1) + (A - 1) * cos - beta * sin;
      break;

    case FILTER_TYPES.HIGHSHELF:
      const beta2 = Math.sqrt(A) / Q;

      b0 = A * ((A + 1) + (A - 1) * cos + beta2 * sin);
      b1 = -2 * A * ((A - 1) + (A + 1) * cos);
      b2 = A * ((A + 1) + (A - 1) * cos - beta2 * sin);
      a0 = (A + 1) - (A - 1) * cos + beta2 * sin;
      a1 = 2 * ((A - 1) - (A + 1) * cos);
      a2 = (A + 1) - (A - 1) * cos - beta2 * sin;
      break;

    case FILTER_TYPES.GENERIC_NORMALIZED:
      // Use provided coefficients directly (already normalized with a0 = 1)
      if (!filter.genericCoeffs) {
        throw new Error('Generic normalized filter requires genericCoeffs to be provided');
      }

      b0 = filter.genericCoeffs.b0;
      b1 = filter.genericCoeffs.b1;
      b2 = filter.genericCoeffs.b2;
      a0 = 1; // Always 1 for normalized filters
      a1 = filter.genericCoeffs.a1;
      a2 = filter.genericCoeffs.a2;
      break;
  }

  // Normalize coefficients by a0
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a0: 1,
    a1: a1 / a0,
    a2: a2 / a0
  };
}

/**
 * Calculate the complex frequency response of a biquad filter
 */
export function calculateBiquadResponse(
  coeffs: BiquadCoefficients,
  frequency: number,
  sampleRate: number
): { magnitude: number; phase: number } {
  // Normalized frequency
  const omega = 2 * Math.PI * frequency / sampleRate;

  // Calculate complex response H(e^jω)
  const cos1 = Math.cos(omega);
  const cos2 = Math.cos(2 * omega);
  const sin1 = Math.sin(omega);
  const sin2 = Math.sin(2 * omega);

  // Numerator: b0 + b1*e^(-jω) + b2*e^(-j2ω)
  const numReal = coeffs.b0 + coeffs.b1 * cos1 + coeffs.b2 * cos2;
  const numImag = -coeffs.b1 * sin1 - coeffs.b2 * sin2;

  // Denominator: a0 + a1*e^(-jω) + a2*e^(-j2ω)
  const denReal = coeffs.a0 + coeffs.a1 * cos1 + coeffs.a2 * cos2;
  const denImag = -coeffs.a1 * sin1 - coeffs.a2 * sin2;

  // Complex division: (numReal + j*numImag) / (denReal + j*denImag)
  const denomMagSq = denReal * denReal + denImag * denImag;
  const responseReal = (numReal * denReal + numImag * denImag) / denomMagSq;
  const responseImag = (numImag * denReal - numReal * denImag) / denomMagSq;

  // Magnitude and phase
  const magnitude = Math.sqrt(responseReal * responseReal + responseImag * responseImag);
  const phase = Math.atan2(responseImag, responseReal);

  return { magnitude, phase };
}

/**
 * Calculate the frequency response magnitude in dB for a biquad filter
 */
export function calculateBiquadGainDB(
  filter: BiquadFilter,
  frequency: number
): number {
  const coeffs = calculateBiquadCoefficients(filter);
  const response = calculateBiquadResponse(coeffs, frequency, filter.sampleRate);

  // Convert magnitude to dB
  return 20 * Math.log10(Math.abs(response.magnitude));
}

/**
 * Calculate frequency response for multiple frequencies
 */
export function calculateBiquadFrequencyResponse(
  filter: BiquadFilter,
  frequencies: number[]
): Array<{ frequency: number; gainDB: number; phase: number }> {
  const coeffs = calculateBiquadCoefficients(filter);

  return frequencies.map(freq => {
    const response = calculateBiquadResponse(coeffs, freq, filter.sampleRate);
    return {
      frequency: freq,
      gainDB: 20 * Math.log10(Math.abs(response.magnitude)),
      phase: response.phase
    };
  });
}

/**
 * Create a biquad filter configuration
 */
export function createBiquadFilter(
  type: BiquadFilterType,
  frequency: number,
  gain: number,
  Q: number,
  sampleRate = 48000
): BiquadFilter {
  return {
    type,
    frequency,
    gain,
    Q,
    sampleRate
  };
}

/**
 * Convert Q factor to bandwidth in octaves using the Audio EQ Cookbook formula
 * For digital filters with bilinear transform compensation
 */
export function qToBandwidth(Q: number, omega0: number): number {
  // From Audio EQ Cookbook: 1/Q = 2*sinh(ln(2)/2 * BW * omega0/sin(omega0))
  // Solving for BW: BW = (2/ln(2)) * asinh(1/(2*Q)) * sin(omega0)/omega0

  const oneOverQ = 1 / Q;
  const asinh_term = Math.asinh(oneOverQ / 2);
  const bandwidth = (2 / Math.log(2)) * asinh_term * Math.sin(omega0) / omega0;

  return bandwidth;
}

/**
 * Convert bandwidth in octaves to Q factor using the Audio EQ Cookbook formula
 * For digital filters with bilinear transform compensation
 */
export function bandwidthToQ(bandwidth: number, omega0: number): number {
  // From Audio EQ Cookbook: 1/Q = 2*sinh(ln(2)/2 * BW * omega0/sin(omega0))
  const sinh_term = 2 * Math.sinh(Math.log(2) / 2 * bandwidth * omega0 / Math.sin(omega0));
  return 1 / sinh_term;
}

/**
 * Calculate the bandwidth of a biquad filter
 * Returns the frequency range where the filter has significant effect
 */
export function calculateBiquadBandwidth(
  filter: BiquadFilter
): { lowerFreq: number; upperFreq: number } | null {
  const { type, frequency, Q } = filter;

  // Return null for filters without meaningful bandwidth
  if (Q <= 0 || frequency <= 0) {
    return null;
  }

  switch (type) {
    case FILTER_TYPES.PEAKING: {
      // For peaking filters, use the Audio EQ Cookbook bandwidth formula
      // BW is the bandwidth in octaves between -3 dB frequencies

      const omega0 = 2 * Math.PI * frequency / filter.sampleRate;
      const bandwidthOctaves = qToBandwidth(Q, omega0);

      // Convert octave bandwidth to frequency range
      // In log space: log(f1) = log(fc) - BW/2*log(2), log(f2) = log(fc) + BW/2*log(2)
      // Which gives: f1 = fc * 2^(-BW/2), f2 = fc * 2^(BW/2)
      // This makes them symmetrical in log space, not linear space
      const halfBandwidthLog = bandwidthOctaves / 2;
      const lowerFreq = frequency / Math.pow(2, halfBandwidthLog);
      const upperFreq = frequency * Math.pow(2, halfBandwidthLog);

      return {
        lowerFreq: Math.max(1, lowerFreq),
        upperFreq: Math.min(filter.sampleRate / 2, upperFreq)
      };
    }    case FILTER_TYPES.LOWPASS: {
      // For lowpass: use Audio EQ Cookbook Q-to-bandwidth calculation
      const omega0 = 2 * Math.PI * frequency / filter.sampleRate;
      const bandwidthOctaves = qToBandwidth(Q, omega0);

      // Convert octave bandwidth to frequency range (symmetrical in log space)
      const halfBandwidthLog = bandwidthOctaves / 2;
      const lowerFreq = frequency / Math.pow(2, halfBandwidthLog);
      const upperFreq = frequency * Math.pow(2, halfBandwidthLog);

      return {
        lowerFreq: Math.max(1, lowerFreq),
        upperFreq: Math.min(filter.sampleRate / 2, upperFreq)
      };
    }

    case FILTER_TYPES.HIGHPASS: {
      // For highpass: use Audio EQ Cookbook Q-to-bandwidth calculation
      const omega0 = 2 * Math.PI * frequency / filter.sampleRate;
      const bandwidthOctaves = qToBandwidth(Q, omega0);

      // Convert octave bandwidth to frequency range (symmetrical in log space)
      const halfBandwidthLog = bandwidthOctaves / 2;
      const lowerFreq = frequency / Math.pow(2, halfBandwidthLog);
      const upperFreq = frequency * Math.pow(2, halfBandwidthLog);

      return {
        lowerFreq: Math.max(1, lowerFreq),
        upperFreq: Math.min(filter.sampleRate / 2, upperFreq)
      };
    }

    case FILTER_TYPES.LOWSHELF: {
      // For low shelf: use Audio EQ Cookbook Q-to-bandwidth calculation
      const omega0 = 2 * Math.PI * frequency / filter.sampleRate;
      const bandwidthOctaves = qToBandwidth(Q, omega0);

      // Convert octave bandwidth to frequency range (symmetrical in log space)
      const halfBandwidthLog = bandwidthOctaves / 2;
      const lowerFreq = frequency / Math.pow(2, halfBandwidthLog);
      const upperFreq = frequency * Math.pow(2, halfBandwidthLog);

      return {
        lowerFreq: Math.max(1, lowerFreq),
        upperFreq: Math.min(filter.sampleRate / 2, upperFreq)
      };
    }

    case FILTER_TYPES.HIGHSHELF: {
      // For high shelf: use Audio EQ Cookbook Q-to-bandwidth calculation
      const omega0 = 2 * Math.PI * frequency / filter.sampleRate;
      const bandwidthOctaves = qToBandwidth(Q, omega0);

      // Convert octave bandwidth to frequency range (symmetrical in log space)
      const halfBandwidthLog = bandwidthOctaves / 2;
      const lowerFreq = frequency / Math.pow(2, halfBandwidthLog);
      const upperFreq = frequency * Math.pow(2, halfBandwidthLog);

      return {
        lowerFreq: Math.max(1, lowerFreq),
        upperFreq: Math.min(filter.sampleRate / 2, upperFreq)
      };
    }

    default:
      return null;
  }
}

/**
 * Validate biquad filter parameters
 */
export function validateBiquadFilter(filter: BiquadFilter): boolean {
  // For generic normalized filters, validate the coefficients instead of standard parameters
  if (filter.type === FILTER_TYPES.GENERIC_NORMALIZED) {
    return (
      filter.genericCoeffs !== undefined &&
      isFinite(filter.genericCoeffs.b0) &&
      isFinite(filter.genericCoeffs.b1) &&
      isFinite(filter.genericCoeffs.b2) &&
      isFinite(filter.genericCoeffs.a1) &&
      isFinite(filter.genericCoeffs.a2) &&
      filter.sampleRate > 0
    );
  }

  // Standard validation for other filter types
  return (
    filter.frequency > 0 &&
    filter.frequency < filter.sampleRate / 2 && // Nyquist limit
    filter.Q > 0 &&
    filter.sampleRate > 0 &&
    isFinite(filter.gain)
  );
}

/**
 * Create a generic normalized biquad filter with 5-element definition (a0 = 1)
 * @param b0 - Numerator coefficient b0
 * @param b1 - Numerator coefficient b1
 * @param b2 - Numerator coefficient b2
 * @param a1 - Denominator coefficient a1 (a0 is implicitly 1)
 * @param a2 - Denominator coefficient a2 (a0 is implicitly 1)
 * @param sampleRate - Sample rate in Hz
 * @returns BiquadFilter object for generic normalized filter
 */
export function createGenericNormalizedBiquad(
  b0: number,
  b1: number,
  b2: number,
  a1: number,
  a2: number,
  sampleRate: number = 48000
): BiquadFilter {
  return {
    type: FILTER_TYPES.GENERIC_NORMALIZED,
    frequency: 1000, // Placeholder - not used for generic filters
    gain: 0,         // Placeholder - not used for generic filters
    Q: 1,            // Placeholder - not used for generic filters
    sampleRate,
    genericCoeffs: {
      b0,
      b1,
      b2,
      a1,
      a2
    }
  };
}
