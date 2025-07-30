/**
 * Core filter calculation utilities for frequency response analysis
 * Contains only mathematical calculations, no visualization code
 */

export interface Filter {
  id: number;
  icon: string; // e.g., 'filter-peak', 'filter-low-shelf', 'filter-high-shelf'
  text: string;
  frequency: number;
  gain: number;
  Q?: number; // Q factor, representing width/slope
  enabled: boolean;
}

export interface FrequencyResponsePoint {
  frequency: number;
  gain: number;
}

/**
 * Calculate the gain response of a filter at a specific frequency
 */
export function calculateFilterGain(freq: number, band: Filter): number {
  if (!band.enabled) return 0;

  const A_db = band.gain;
  const Fc = band.frequency;
  const Q = Math.max(0.01, band.Q || 1.0); // Ensure Q is at least 0.01 to avoid division by zero

  let gainVal_db = 0;

  switch (band.icon) {
    case 'filter-peak':
      // Added explicit check for A_db === 0 to ensure flat line at 0 gain
      if (A_db === 0) {
        gainVal_db = 0;
      } else {
        const normalizedLogFreqPeak = Math.log10(freq / Fc);
        const widthFactor = 1 / Q;
        gainVal_db = A_db * Math.exp(-Math.pow(normalizedLogFreqPeak / widthFactor, 2));
      }
      break;

    case 'filter-low-shelf':
      // Ensure that as frequency approaches 0, the gain approaches A_db.
      // And as frequency increases, it approaches 0 (or flat).
      const ratioLow = freq / Fc;
      const slopeFactorLow = 1 + Math.pow(ratioLow, 2 * Q); // Q controls steepness
      gainVal_db = A_db / slopeFactorLow;
      break;

    case 'filter-high-shelf':
      // Ensure that as frequency increases, the gain approaches A_db.
      // And as frequency approaches 0, it approaches 0 (or flat).
      const ratioHigh = Fc / freq;
      const slopeFactorHigh = 1 + Math.pow(ratioHigh, 2 * Q); // Q controls steepness
      gainVal_db = A_db / slopeFactorHigh;
      break;

    default:
      return 0;
  }

  return gainVal_db;
}

/**
 * Calculate frequency response for a list of filters
 * @param filters Array of filters to calculate response for
 * @param f_low Lower frequency bound in Hz
 * @param f_high Upper frequency bound in Hz 
 * @param points_per_octave Number of calculation points per octave
 * @returns Array of frequency response points
 */
export function calculateFrequencyResponse(
  filters: Filter[],
  f_low: number,
  f_high: number,
  points_per_octave: number
): FrequencyResponsePoint[] {
  // Calculate total number of points based on frequency range and points per octave
  const octaves = Math.log2(f_high / f_low);
  const totalPoints = Math.ceil(octaves * points_per_octave);
  
  const points: FrequencyResponsePoint[] = [];
  
  for (let i = 0; i <= totalPoints; i++) {
    // Generate logarithmically spaced frequencies
    const logFreq = Math.log10(f_low) + (i / totalPoints) * (Math.log10(f_high) - Math.log10(f_low));
    const frequency = Math.pow(10, logFreq);
    
    // Sum gains from all enabled filters
    let totalGain = 0;
    filters.forEach(filter => {
      if (filter.enabled) {
        totalGain += calculateFilterGain(frequency, filter);
      }
    });
    
    points.push({ frequency, gain: totalGain });
  }
  
  return points;
}

/**
 * Calculate frequency response for a single filter
 * @param filter Single filter to calculate response for
 * @param f_low Lower frequency bound in Hz
 * @param f_high Upper frequency bound in Hz 
 * @param points_per_octave Number of calculation points per octave
 * @returns Array of frequency response points
 */
export function calculateSingleFilterResponse(
  filter: Filter,
  f_low: number,
  f_high: number,
  points_per_octave: number
): FrequencyResponsePoint[] {
  return calculateFrequencyResponse([filter], f_low, f_high, points_per_octave);
}
