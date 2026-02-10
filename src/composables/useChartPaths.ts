export interface ChartConfig {
  minFreq: number
  maxFreq: number
  minMag: number
  maxMag: number
  chartWidth: number   // total SVG width available for the plot area
  chartHeight: number  // total SVG height available for the plot area
  offsetX: number      // left margin / x-offset where the plot starts
  offsetY: number      // top margin / y-offset where the plot starts
}

/** Standard chart configs used across the wizards */
export const CHART_CONFIGS = {
  /** Steps 1/3 in EQ wizard, step 5 in Measurement wizard: 800×300, ±30 dB, 20–25 kHz */
  standard: {
    minFreq: 20, maxFreq: 25000, minMag: -30, maxMag: 30,
    chartWidth: 720, chartHeight: 260, offsetX: 40, offsetY: 20,
  } as ChartConfig,

  /** Step 3 in EQ wizard: 800×300, ±20 dB, 20–20 kHz */
  step3: {
    minFreq: 20, maxFreq: 20000, minMag: -20, maxMag: 20,
    chartWidth: 720, chartHeight: 260, offsetX: 40, offsetY: 20,
  } as ChartConfig,

  /** Steps 4/5 in EQ wizard: 800×300, ±10 dB, 20–20 kHz */
  optimisation: {
    minFreq: 20, maxFreq: 20000, minMag: -10, maxMag: 10,
    chartWidth: 720, chartHeight: 260, offsetX: 40, offsetY: 20,
  } as ChartConfig,

  /** Step 2 preview in EQ wizard: 800×200, ±20 dB, 20–20 kHz */
  preview: {
    minFreq: 20, maxFreq: 20000, minMag: -20, maxMag: 20,
    chartWidth: 720, chartHeight: 160, offsetX: 40, offsetY: 10,
  } as ChartConfig,

  /** Measurement wizard step 5: 800×300, ±30 dB, 20–20 kHz */
  measurement: {
    minFreq: 20, maxFreq: 20000, minMag: -30, maxMag: 30,
    chartWidth: 720, chartHeight: 260, offsetX: 40, offsetY: 20,
  } as ChartConfig,
}

/** Convert a frequency value to an X pixel coordinate (log scale). */
export function frequencyToX(freq: number, config: ChartConfig): number {
  return config.offsetX + (Math.log10(freq / config.minFreq) / Math.log10(config.maxFreq / config.minFreq)) * config.chartWidth
}

/** Convert a magnitude value to a Y pixel coordinate (linear scale, inverted). */
export function magnitudeToY(mag: number, config: ChartConfig): number {
  return config.offsetY + (config.maxMag - mag) / (config.maxMag - config.minMag) * config.chartHeight
}

/**
 * Generate an SVG path string for a frequency/magnitude curve.
 * Filters points outside the frequency range.
 */
export function generateFrequencyPath(
  frequencies: number[],
  magnitudes: number[],
  config: ChartConfig
): string {
  if (!frequencies?.length || !magnitudes?.length) return ''

  let path = ''
  for (let i = 0; i < frequencies.length; i++) {
    const f = frequencies[i]
    const mag = magnitudes[i]
    if (f >= config.minFreq && f <= config.maxFreq) {
      const x = frequencyToX(f, config)
      const y = magnitudeToY(mag, config)
      path = path === '' ? `M ${x} ${y}` : `${path} L ${x} ${y}`
    }
  }
  return path
}

interface TargetPoint {
  frequency: number
  target_db: number
  weight?: number
}

/**
 * Generate an SVG path for a target curve, handling boundary clipping
 * so that segments crossing the visible frequency range are properly interpolated.
 *
 * Optionally clips to a user-specified [clipMinFreq, clipMaxFreq] sub-range
 * within the chart's frequency range (used for optimizer target display).
 */
export function generateTargetCurvePath(
  pts: TargetPoint[],
  config: ChartConfig,
  clipMinFreq?: number,
  clipMaxFreq?: number,
): string {
  if (!pts?.length) return ''

  // Determine the effective frequency bounds
  const lo = clipMinFreq != null
    ? Math.max(config.minFreq, Math.max(20, Math.floor(clipMinFreq)))
    : config.minFreq
  const hi = clipMaxFreq != null
    ? Math.min(config.maxFreq, Math.min(25000, Math.ceil(clipMaxFreq)))
    : config.maxFreq
  if (lo >= hi) return ''

  // Sort by frequency
  const points = [...pts]
    .filter(p => p && typeof p === 'object')
    .sort((a, b) => a.frequency - b.frequency)

  if (points.length === 0) return ''

  // Linear interpolation helper
  const lerp = (x: number, x1: number, y1: number, x2: number, y2: number): number => {
    if (x2 === x1) return y1
    return y1 + (y2 - y1) * (x - x1) / (x2 - x1)
  }

  // Collect clipped segments
  const clipped: { freq: number; db: number }[] = []

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    let f1 = p1.frequency
    let f2 = p2.frequency
    let db1 = p1.target_db
    let db2 = p2.target_db

    if (f1 <= 0 || f2 <= 0 || f1 === f2) continue

    // Clip to [lo, hi]
    if (f1 < lo) {
      if (f2 <= lo) continue
      db1 = lerp(lo, f1, db1, f2, db2)
      f1 = lo
    }
    if (f2 > hi) {
      if (f1 >= hi) continue
      db2 = lerp(hi, p1.frequency, p1.target_db, p2.frequency, p2.target_db)
      f2 = hi
    }

    if (clipped.length === 0 || clipped[clipped.length - 1].freq !== f1) {
      clipped.push({ freq: f1, db: db1 })
    }
    if (f1 !== f2) {
      clipped.push({ freq: f2, db: db2 })
    }
  }

  if (clipped.length === 0) return ''

  // Build SVG path
  let path = ''
  for (let i = 0; i < clipped.length; i++) {
    const x = frequencyToX(clipped[i].freq, config)
    const y = magnitudeToY(clipped[i].db, config)
    path = i === 0 ? `M ${x} ${y}` : `${path} L ${x} ${y}`
  }
  return path
}
