/**
 * Core filter calculation utilities for frequency response analysis
 * Contains only mathematical calculations, no visualization code
 */

import {
  createBiquadFilter,
  calculateBiquadGainDB,
  type BiquadFilterType
} from './biquad';

export interface Filter {
  id: number;
  /**
   * Which kind of filter this is, in the biquad vocabulary.
   *
   * Not an icon, despite what this field used to be called: getFilterIconName()
   * is what turns a kind into an icon name. This is the discriminant every
   * other decision about the filter hangs off -- which coefficients to compute,
   * whether the frequency/gain/Q controls mean anything, whether a bank is
   * owned by a speaker preset.
   */
  kind: BiquadFilterType;
  text: string;
  frequency: number;
  gain: number;
  Q?: number; // Q factor, representing width/slope
  enabled: boolean;
  // Only raw-coefficient filters carry these; see isRawCoefficientFilter().
  genericCoeffs?: {
    b0: number;
    b1: number;
    b2: number;
    a1: number;
    a2: number;
  };
}

/**
 * Whether this filter is defined by raw biquad coefficients rather than by
 * frequency, gain and Q.
 *
 * Speaker presets are written to the DSP as coefficients, so this is also what
 * marks a bank as preset-owned. It is a predicate rather than a comparison
 * spelled out at each call site because the meaning -- "there is nothing here
 * to edit band-by-band" -- is not something a reader should have to infer from
 * a string literal.
 */
export function isRawCoefficientFilter(filter: Filter): boolean {
  return filter.kind === 'generic_normalized';
}

export interface FrequencyResponsePoint {
  frequency: number;
  gain: number;
}

/**
 * Calculate the gain response of a filter at a specific frequency using biquad calculations
 */
export function calculateFilterGain(freq: number, band: Filter, sampleRate: number = 48000): number {
  if (!band.enabled) return 0;

  // For generic normalized filters, create with coefficients
  if (isRawCoefficientFilter(band) && band.genericCoeffs) {
    const biquadFilter = {
      type: 'generic_normalized' as BiquadFilterType,
      frequency: band.frequency, // Not used for generic filters
      gain: band.gain,           // Not used for generic filters
      Q: band.Q || 1.0,         // Not used for generic filters
      sampleRate,
      genericCoeffs: band.genericCoeffs
    };

    return calculateBiquadGainDB(biquadFilter, freq);
  }

  // Create standard biquad filter with the band parameters
  const biquadFilter = createBiquadFilter(
    band.kind,
    band.frequency,
    band.gain,
    band.Q || 1.0,
    sampleRate
  );

  // Calculate the gain in dB at the specified frequency
  return calculateBiquadGainDB(biquadFilter, freq);
}

/**
 * Calculate frequency response for a list of filters
 * @param filters Array of filters to calculate response for
 * @param f_low Lower frequency bound in Hz
 * @param f_high Upper frequency bound in Hz
 * @param points_per_octave Number of calculation points per octave
 * @param sampleRate Sample rate in Hz (default: 48000)
 * @returns Array of frequency response points
 */
export function calculateFrequencyResponse(
  filters: Filter[],
  f_low: number,
  f_high: number,
  points_per_octave: number,
  sampleRate: number = 48000
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
        totalGain += calculateFilterGain(frequency, filter, sampleRate);
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
 * @param sampleRate Sample rate in Hz (default: 48000)
 * @returns Array of frequency response points
 */
export function calculateSingleFilterResponse(
  filter: Filter,
  f_low: number,
  f_high: number,
  points_per_octave: number,
  sampleRate: number = 48000
): FrequencyResponsePoint[] {
  return calculateFrequencyResponse([filter], f_low, f_high, points_per_octave, sampleRate);
}
