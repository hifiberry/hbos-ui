/**
 * Biquad filter implementations for standard audio filter types
 * Contains mathematically accurate biquad filter calculations
 */

export type BiquadFilterType = 
  | 'lowpass' 
  | 'highpass' 
  | 'lowshelf' 
  | 'highshelf' 
  | 'peaking';

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
    case 'lowpass':
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = (1 - cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
      break;
      
    case 'highpass':
      b0 = (1 + cos) / 2;
      b1 = -(1 + cos);
      b2 = (1 + cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
      break;
      
    case 'peaking':
      const linearGain = Math.pow(10, gain / 20);
      const alphaEQ = alpha * linearGain;
      
      b0 = 1 + alphaEQ;
      b1 = -2 * cos;
      b2 = 1 - alphaEQ;
      a0 = 1 + alpha / linearGain;
      a1 = -2 * cos;
      a2 = 1 - alpha / linearGain;
      break;
      
    case 'lowshelf':
      const beta = Math.sqrt(A) / Q;
      
      b0 = A * ((A + 1) - (A - 1) * cos + beta * sin);
      b1 = 2 * A * ((A - 1) - (A + 1) * cos);
      b2 = A * ((A + 1) - (A - 1) * cos - beta * sin);
      a0 = (A + 1) + (A - 1) * cos + beta * sin;
      a1 = -2 * ((A - 1) + (A + 1) * cos);
      a2 = (A + 1) + (A - 1) * cos - beta * sin;
      break;
      
    case 'highshelf':
      const beta2 = Math.sqrt(A) / Q;
      
      b0 = A * ((A + 1) + (A - 1) * cos + beta2 * sin);
      b1 = -2 * A * ((A - 1) + (A + 1) * cos);
      b2 = A * ((A + 1) + (A - 1) * cos - beta2 * sin);
      a0 = (A + 1) - (A - 1) * cos + beta2 * sin;
      a1 = 2 * ((A - 1) - (A + 1) * cos);
      a2 = (A + 1) - (A - 1) * cos - beta2 * sin;
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
 * Validate biquad filter parameters
 */
export function validateBiquadFilter(filter: BiquadFilter): boolean {
  return (
    filter.frequency > 0 &&
    filter.frequency < filter.sampleRate / 2 && // Nyquist limit
    filter.Q > 0 &&
    filter.sampleRate > 0 &&
    isFinite(filter.gain)
  );
}
