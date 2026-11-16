import { describe, it, expect } from 'vitest'
import { modeToMatrix, matrixToMode } from '@/helpers/aas_matrix'
import type { AasMatrix } from '@/api/aas'
import type { AudioMode } from '@/helpers/mixing_matrix'

const modes: AudioMode[] = ['stereo', 'swapped', 'mono', 'left', 'right']

const players = (side: string, to: number, gain_db?: number) => ({
  from: `players.${side}`,
  to,
  ...(gain_db === undefined ? {} : { gain_db }),
})
const analog = (side: string, to: number) => ({ from: `analog.${side}`, to })

const expected: Record<AudioMode, ReturnType<typeof players>[]> = {
  stereo: [players('left', 1), players('right', 2)],
  swapped: [players('left', 2), players('right', 1)],
  mono: [players('left', 1, -6), players('right', 1, -6), players('left', 2, -6), players('right', 2, -6)],
  left: [players('left', 1), players('left', 2)],
  right: [players('right', 1), players('right', 2)],
}

const playersOnly: AasMatrix = {
  outputs: [{ output: 1, routes: [players('left', 1), players('right', 2)] }],
}

const asAnalog = (routes: { from: string }[]) =>
  routes.map((r) => ({ ...r, from: r.from.replace('players', 'analog') }))

describe('modeToMatrix', () => {
  it.each(modes)('sets %s from a players-only matrix', (mode) => {
    expect(modeToMatrix(playersOnly, mode)).toEqual({ outputs: [{ output: 1, routes: expected[mode] }] })
  })

  it.each(modes)('makes analog follow %s when the matrix routes analog', (mode) => {
    const current: AasMatrix = {
      outputs: [{ output: 1, routes: [players('left', 1), players('right', 2), analog('left', 1), analog('right', 2)] }],
    }
    expect(modeToMatrix(current, mode).outputs[0].routes).toEqual([
      ...expected[mode],
      ...asAnalog(expected[mode]),
    ])
  })

  it('keeps further outputs as they are', () => {
    const other = { output: 2, routes: [players('left', 1, -3)] }
    const result = modeToMatrix({ outputs: [playersOnly.outputs[0], other] }, 'swapped')
    expect(result.outputs).toEqual([{ output: 1, routes: expected.swapped }, other])
  })

  it('adds the master when the matrix does not name it', () => {
    const other = { output: 2, routes: [] }
    const result = modeToMatrix({ outputs: [other] }, 'left')
    expect(result.outputs).toEqual([{ output: 1, routes: expected.left }, other])
  })
})

describe('matrixToMode', () => {
  it.each(modes)('reads %s back', (mode) => {
    expect(matrixToMode(modeToMatrix(playersOnly, mode))).toBe(mode)
  })

  it('reads the mode from the players routes when analog is there too', () => {
    const matrix = modeToMatrix(
      { outputs: [{ output: 1, routes: [players('left', 1), analog('left', 1)] }] },
      'mono',
    )
    expect(matrixToMode(matrix)).toBe('mono')
  })

  it('shows an unknown shape as stereo', () => {
    const odd: AasMatrix = { outputs: [{ output: 1, routes: [players('left', 2, -12)] }] }
    expect(matrixToMode(odd)).toBe('stereo')
  })

  it('shows an empty matrix as stereo', () => {
    expect(matrixToMode({ outputs: [] })).toBe('stereo')
    expect(matrixToMode({ outputs: [{ output: 1, routes: [] }] })).toBe('stereo')
  })
})
