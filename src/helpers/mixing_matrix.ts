/**
 * Audio mixing matrix utilities for PipeWire
 * Converts between mode/balance settings and 2x2 mixing matrices
 */

export type AudioMode = 'stereo' | 'swapped' | 'mono' | 'left' | 'right'

/**
 * Convert mode and balance to 2x2 mixing matrix
 *
 * @param mode - Audio mode (stereo, swapped, mono, left, right)
 * @param balance - Balance value from -1 (full left) to +1 (full right), 0 = center
 * @returns 2x2 matrix [[L_in->L_out, L_in->R_out], [R_in->L_out, R_in->R_out]]
 */
export function settingsToMatrix(mode: AudioMode, balance: number): number[][] {
  // Calculate balance gains: balance -1 (left) to +1 (right)
  let leftGain: number
  let rightGain: number

  if (balance < 0) {
    // Favoring left: reduce right channel
    leftGain = 1.0
    rightGain = 1.0 + balance // balance is negative, so this reduces it
  } else {
    // Favoring right: reduce left channel
    leftGain = 1.0 - balance
    rightGain = 1.0
  }

  // Base matrix for each mode
  let matrix: number[][]

  switch (mode) {
    case 'stereo':
      // Identity: L->L, R->R
      matrix = [
        [1, 0],
        [0, 1]
      ]
      break

    case 'swapped':
      // Channels swapped: L->R, R->L
      matrix = [
        [0, 1],
        [1, 0]
      ]
      break

    case 'mono':
      // Both inputs mixed equally to both outputs
      matrix = [
        [0.5, 0.5],
        [0.5, 0.5]
      ]
      break

    case 'left':
      // Left input to both outputs
      matrix = [
        [1, 1],
        [0, 0]
      ]
      break

    case 'right':
      // Right input to both outputs
      matrix = [
        [0, 0],
        [1, 1]
      ]
      break

    default:
      // Fallback to stereo
      matrix = [
        [1, 0],
        [0, 1]
      ]
  }

  // Apply balance gains to output channels
  return [
    [matrix[0][0] * leftGain, matrix[0][1] * leftGain],   // Left output
    [matrix[1][0] * rightGain, matrix[1][1] * rightGain]  // Right output
  ]
}

/**
 * Convert 2x2 mixing matrix back to mode and balance settings
 *
 * @param matrix - 2x2 mixing matrix [[L_in->L_out, L_in->R_out], [R_in->L_out, R_in->R_out]]
 * @returns Object with mode and balance, or null if matrix doesn't match a known pattern
 */
export function matrixToSettings(matrix: number[][]): { mode: AudioMode; balance: number } | null {
  if (!matrix || matrix.length !== 2 || matrix[0].length !== 2 || matrix[1].length !== 2) {
    return null
  }

  // Extract the coefficients
  const ll = matrix[0][0] // Left in -> Left out
  const lr = matrix[0][1] // Left in -> Right out
  const rl = matrix[1][0] // Right in -> Left out
  const rr = matrix[1][1] // Right in -> Right out

  // Calculate balance from output gains
  // Find the maximum gain on each output to determine balance
  const leftOutGain = Math.max(Math.abs(ll), Math.abs(rl))
  const rightOutGain = Math.max(Math.abs(lr), Math.abs(rr))

  let balance = 0
  if (leftOutGain > 0 && rightOutGain > 0) {
    // Both channels present, calculate balance
    const totalGain = leftOutGain + rightOutGain
    if (totalGain > 0) {
      // Normalize to -1 to +1 range
      balance = (rightOutGain - leftOutGain) / totalGain * 2
      // Clamp to valid range
      balance = Math.max(-1, Math.min(1, balance))
    }
  } else if (leftOutGain > 0) {
    balance = -1 // Full left
  } else if (rightOutGain > 0) {
    balance = +1 // Full right
  }

  // Normalize matrix by removing balance to detect base mode
  const normLL = leftOutGain > 0 ? ll / leftOutGain : 0
  const normLR = leftOutGain > 0 ? lr / leftOutGain : 0
  const normRL = rightOutGain > 0 ? rl / rightOutGain : 0
  const normRR = rightOutGain > 0 ? rr / rightOutGain : 0

  // Tolerance for floating point comparison
  const epsilon = 0.01
  const isClose = (a: number, b: number) => Math.abs(a - b) < epsilon

  // Detect mode from normalized matrix
  if (isClose(normLL, 1) && isClose(normLR, 0) && isClose(normRL, 0) && isClose(normRR, 1)) {
    return { mode: 'stereo', balance }
  } else if (isClose(normLL, 0) && isClose(normLR, 1) && isClose(normRL, 1) && isClose(normRR, 0)) {
    return { mode: 'swapped', balance }
  } else if (isClose(normLL, 0.5) && isClose(normLR, 0.5) && isClose(normRL, 0.5) && isClose(normRR, 0.5)) {
    return { mode: 'mono', balance }
  } else if (isClose(normLL, 1) && isClose(normLR, 1) && isClose(normRL, 0) && isClose(normRR, 0)) {
    return { mode: 'left', balance }
  } else if (isClose(normLL, 0) && isClose(normLR, 0) && isClose(normRL, 1) && isClose(normRR, 1)) {
    return { mode: 'right', balance }
  }

  // Unknown matrix pattern, default to stereo with detected balance
  return { mode: 'stereo', balance }
}
