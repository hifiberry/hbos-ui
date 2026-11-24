/**
 * The notes shown beside a latency setting, and what counts as one.
 *
 * "Below" is strict throughout: the recommended, the lowest safe value and
 * the AES67 floor themselves are not warned.
 */

export type Note = { level: 'amber' | 'red'; text: string } | null

export const LATENCY_MIN_MS = 1
export const LATENCY_MAX_MS = 100

/**
 * The card latency against the board's figures from aas's `GET /settings`.
 * An older aas gives no figures, and then there is nothing to warn about.
 */
export function cardLatencyNote(ms: number, recommended?: number, min?: number): Note {
  if (min !== undefined && ms < min) {
    return { level: 'red', text: 'Below what this board handles: dropouts are likely.' }
  }
  if (recommended !== undefined && ms < recommended) {
    return {
      level: 'amber',
      text: 'Lower than recommended for this board: it may drop out under heavy load.',
    }
  }
  return null
}

/** The AES67 input latency against the floor a playing stream holds; no floor before one plays. */
export function aes67LatencyNote(ms: number, floor?: number): Note {
  if (floor !== undefined && ms < floor) {
    return {
      level: 'amber',
      text: `This board holds at least ${floor} ms; the stream plays at ${floor} ms.`,
    }
  }
  return null
}

/** A latency both settings take: a whole number of ms, 1 to 100. Anything else is `null`. */
export function validLatency(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= LATENCY_MIN_MS &&
    value <= LATENCY_MAX_MS
    ? value
    : null
}

export function useLatencyNotes() {
  return { cardLatencyNote, aes67LatencyNote, validLatency }
}
