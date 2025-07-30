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
  icon: BiquadFilterType; // Use biquad filter types directly
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
 * Calculate the gain response of a filter at a specific frequency using biquad calculations
 */
export function calculateFilterGain(freq: number, band: Filter, sampleRate: number = 48000): number {
  if (!band.enabled) return 0;

  // Create biquad filter with the band parameters
  const biquadFilter = createBiquadFilter(
    band.icon, // Now directly using BiquadFilterType
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
