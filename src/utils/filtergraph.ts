/**
 * Filter visualization and graph utilities
 * Contains coordinate conversion, SVG generation, and graph rendering functions
 */

import {
  type Filter,
  type FrequencyResponsePoint,
  calculateFilterGain
} from './filtercalc';

export interface GraphDimensions {
  plotWidth: number;
  plotHeight: number;
  minFreq?: number;
  maxFreq?: number;
  minGain?: number;
  maxGain?: number;
}

export interface GraphData {
  linePath: string;
  areaPath?: string;
}

export interface VisualFrequencyResponsePoint extends FrequencyResponsePoint {
  x: number;
  y: number;
}

/**
 * Default frequency and gain ranges for visualization
 */
export const DEFAULT_FREQ_RANGE = {
  min: 20,
  max: 20000
} as const;

export const DEFAULT_GAIN_RANGE = {
  min: -25,
  max: 25
} as const;

/**
 * Convert frequency to X coordinate using logarithmic scaling
 */
export function frequencyToX(
  freq: number,
  plotWidth: number,
  minFreq: number = DEFAULT_FREQ_RANGE.min,
  maxFreq: number = DEFAULT_FREQ_RANGE.max
): number {
  const logMinFreq = Math.log10(minFreq);
  const logMaxFreq = Math.log10(maxFreq);
  const logFreq = Math.log10(freq);
  return ((logFreq - logMinFreq) / (logMaxFreq - logMinFreq)) * plotWidth;
}

/**
 * Convert X coordinate to frequency using logarithmic scaling
 */
export function xToFrequency(
  x: number,
  plotWidth: number,
  minFreq: number = DEFAULT_FREQ_RANGE.min,
  maxFreq: number = DEFAULT_FREQ_RANGE.max
): number {
  const logMinFreq = Math.log10(minFreq);
  const logMaxFreq = Math.log10(maxFreq);
  const logFreq = logMinFreq + (x / plotWidth) * (logMaxFreq - logMinFreq);
  return Math.pow(10, logFreq);
}

/**
 * Convert gain (dB) to Y coordinate
 */
export function gainToY(
  gain: number,
  plotHeight: number,
  minGain: number = DEFAULT_GAIN_RANGE.min,
  maxGain: number = DEFAULT_GAIN_RANGE.max
): number {
  return plotHeight - ((gain - minGain) / (maxGain - minGain)) * plotHeight;
}

/**
 * Convert Y coordinate to gain (dB)
 */
export function yToGain(
  y: number,
  plotHeight: number,
  minGain: number = DEFAULT_GAIN_RANGE.min,
  maxGain: number = DEFAULT_GAIN_RANGE.max
): number {
  return maxGain - (y / plotHeight) * (maxGain - minGain);
}

/**
 * Calculate bandwidth start frequency for a filter
 */
export function calculateFilterBandwidthStart(filter: Filter): number | null {
  if (typeof filter.Q !== 'number' || filter.Q <= 0) {
    return null;
  }

  let bandwidthHz;

  // Different interpretations of Q for different filter types
  if (filter.icon === 'peaking') {
    bandwidthHz = filter.frequency / filter.Q; // Standard Q for peak filter
  } else {
    // For shelf filters, Q influences the slope. We'll use a scaled Fc/Q
    // as a visual approximation for the 'transition width'.
    bandwidthHz = filter.frequency / (filter.Q * 2); // Make shelf "width" less dramatic
  }

  // Clamp values to graph limits
  return Math.max(DEFAULT_FREQ_RANGE.min, filter.frequency - (bandwidthHz / 2));
}

/**
 * Calculate bandwidth end frequency for a filter
 */
export function calculateFilterBandwidthEnd(filter: Filter): number | null {
  if (typeof filter.Q !== 'number' || filter.Q <= 0) {
    return null;
  }

  let bandwidthHz;

  if (filter.icon === 'peaking') {
    bandwidthHz = filter.frequency / filter.Q;
  } else {
    bandwidthHz = filter.frequency / (filter.Q * 2);
  }

  // Clamp values to graph limits
  return Math.min(DEFAULT_FREQ_RANGE.max, filter.frequency + (bandwidthHz / 2));
}

/**
 * Convert frequency response points to visual points with coordinates
 */
export function addCoordinatesToPoints(
  points: FrequencyResponsePoint[],
  dimensions: GraphDimensions,
  minFreq = DEFAULT_FREQ_RANGE.min,
  maxFreq = DEFAULT_FREQ_RANGE.max
): VisualFrequencyResponsePoint[] {
  return points.map(point => ({
    ...point,
    x: frequencyToX(point.frequency, dimensions.plotWidth, minFreq, maxFreq),
    y: gainToY(point.gain, dimensions.plotHeight, dimensions.minGain ?? DEFAULT_GAIN_RANGE.min, dimensions.maxGain ?? DEFAULT_GAIN_RANGE.max)
  }));
}

/**
 * Generate frequency response points for a single filter with coordinates
 */
export function generateFilterResponse(
  filter: Filter,
  dimensions: GraphDimensions,
  numPoints = 200,
  minFreq = DEFAULT_FREQ_RANGE.min,
  maxFreq = DEFAULT_FREQ_RANGE.max,
  sampleRate = 48000
): VisualFrequencyResponsePoint[] {
  const points: VisualFrequencyResponsePoint[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const logFreq = Math.log10(minFreq) + (i / numPoints) * (Math.log10(maxFreq) - Math.log10(minFreq));
    const frequency = Math.pow(10, logFreq);
    const gain = calculateFilterGain(frequency, filter, sampleRate);
    const x = frequencyToX(frequency, dimensions.plotWidth, minFreq, maxFreq);
    const y = gainToY(gain, dimensions.plotHeight, dimensions.minGain ?? DEFAULT_GAIN_RANGE.min, dimensions.maxGain ?? DEFAULT_GAIN_RANGE.max);

    points.push({ frequency, gain, x, y });
  }

  return points;
}

/**
 * Generate combined frequency response for multiple filters with coordinates
 */
export function generateCombinedResponse(
  filters: Filter[],
  dimensions: GraphDimensions,
  numPoints = 200,
  minFreq = DEFAULT_FREQ_RANGE.min,
  maxFreq = DEFAULT_FREQ_RANGE.max,
  sampleRate = 48000
): VisualFrequencyResponsePoint[] {
  const points: VisualFrequencyResponsePoint[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const logFreq = Math.log10(minFreq) + (i / numPoints) * (Math.log10(maxFreq) - Math.log10(minFreq));
    const frequency = Math.pow(10, logFreq);

    // Sum gains from all enabled filters
    let totalGain = 0;
    filters.forEach(filter => {
      if (filter.enabled) {
        totalGain += calculateFilterGain(frequency, filter, sampleRate);
      }
    });

    const x = frequencyToX(frequency, dimensions.plotWidth, minFreq, maxFreq);
    const y = gainToY(totalGain, dimensions.plotHeight, dimensions.minGain ?? DEFAULT_GAIN_RANGE.min, dimensions.maxGain ?? DEFAULT_GAIN_RANGE.max);

    points.push({ frequency, gain: totalGain, x, y });
  }

  return points;
}

/**
 * Convert response points to SVG path data
 */
export function pointsToSVGPath(points: VisualFrequencyResponsePoint[]): string {
  if (points.length === 0) return '';

  const linePoints = points.map(p => `${p.x},${p.y}`);
  return `M ${linePoints.join(' L ')}`;
}

/**
 * Convert response points to SVG area path data (includes baseline)
 */
export function pointsToSVGAreaPath(
  points: VisualFrequencyResponsePoint[],
  dimensions: GraphDimensions,
  minFreq = DEFAULT_FREQ_RANGE.min,
  maxFreq = DEFAULT_FREQ_RANGE.max
): string {
  if (points.length === 0) return '';

  const baselineY = gainToY(0, dimensions.plotHeight, dimensions.minGain ?? DEFAULT_GAIN_RANGE.min, dimensions.maxGain ?? DEFAULT_GAIN_RANGE.max);
  const startX = frequencyToX(minFreq, dimensions.plotWidth, minFreq, maxFreq);
  const endX = frequencyToX(maxFreq, dimensions.plotWidth, minFreq, maxFreq);

  const areaPoints: string[] = [];

  // Start at baseline
  areaPoints.push(`${startX},${baselineY}`);

  // Add all response points
  points.forEach(p => {
    areaPoints.push(`${p.x},${p.y}`);
  });

  // End at baseline
  areaPoints.push(`${endX},${baselineY}`);
  areaPoints.push(`${startX},${baselineY}`);

  return `M ${areaPoints.join(' L ')}`;
}

/**
 * Generate complete graph data for a single filter
 */
export function generateFilterGraphData(
  filter: Filter,
  dimensions: GraphDimensions,
  numPoints = 200
): GraphData | null {
  if (!filter.enabled) return null;

  const points = generateFilterResponse(filter, dimensions, numPoints);

  return {
    linePath: pointsToSVGPath(points),
    areaPath: pointsToSVGAreaPath(points, dimensions)
  };
}

/**
 * Generate complete graph data for combined filters
 */
export function generateCombinedGraphData(
  filters: Filter[],
  dimensions: GraphDimensions,
  numPoints = 200
): GraphData | null {
  const enabledFilters = filters.filter(f => f.enabled);
  if (enabledFilters.length === 0) return null;

  const points = generateCombinedResponse(filters, dimensions, numPoints);

  return {
    linePath: pointsToSVGPath(points)
  };
}

/**
 * Generate frequency grid lines for logarithmic display
 */
export function generateFrequencyGridLines(
  minFreq = DEFAULT_FREQ_RANGE.min,
  maxFreq = DEFAULT_FREQ_RANGE.max
): number[] {
  const lines: Set<number> = new Set();

  // Major grid lines (powers of 10)
  for (let i = 100; i <= maxFreq; i *= 10) {
    if (i >= minFreq) {
      lines.add(i);
    }
  }

  // Minor grid lines (2x and 5x multipliers)
  const multipliers = [2, 5];
  for (let i = 10; i < maxFreq * 2; i *= 10) {
    for (const mult of multipliers) {
      const freq = i * mult;
      if (freq >= minFreq && freq <= maxFreq) {
        lines.add(freq);
      }
    }
  }

  return Array.from(lines)
    .filter(f => f >= minFreq && f <= maxFreq)
    .sort((a, b) => a - b);
}
