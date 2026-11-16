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

  it('names only the master, so the other outputs are left to aas', () => {
    const other = { output: 2, routes: [players('left', 1, -3)] }
    const result = modeToMatrix({ outputs: [playersOnly.outputs[0], other] }, 'swapped')
    expect(result).toEqual({ outputs: [{ output: 1, routes: expected.swapped }] })
  })

  it('names the master when the matrix does not', () => {
    const result = modeToMatrix({ outputs: [{ output: 2, routes: [] }] }, 'left')
    expect(result).toEqual({ outputs: [{ output: 1, routes: expected.left }] })
  })

  it('works from the shape GET returns: explicit 0.0 gains, analog included', () => {
    const get: AasMatrix = {
      outputs: [
        {
          output: 1,
          routes: [
            { from: 'players.left', to: 1, gain_db: 0.0 },
            { from: 'players.right', to: 2, gain_db: 0.0 },
            { from: 'analog.left', to: 1, gain_db: 0.0 },
            { from: 'analog.right', to: 2, gain_db: 0.0 },
          ],
        },
        { output: 2, routes: [{ from: 'players.left', to: 1, gain_db: 0.0 }] },
      ],
    }
    expect(matrixToMode(get)).toBe('stereo')
    const put = modeToMatrix(get, 'mono')
    expect(put.outputs).toHaveLength(1)
    expect(put.outputs[0].routes).toEqual([...expected.mono, ...asAnalog(expected.mono)])
    expect(matrixToMode(put)).toBe('mono')
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

  it('reads mono within 0.1 dB of -6', () => {
    const near = (g: number): AasMatrix => ({
      outputs: [{
        output: 1,
        routes: [players('left', 1, g), players('right', 1, g), players('left', 2, g), players('right', 2, g)],
      }],
    })
    expect(matrixToMode(near(-6.02))).toBe('mono')
    expect(matrixToMode(near(-5.95))).toBe('mono')
    expect(matrixToMode(near(-6.3))).toBe('stereo')
  })

  it('reads explicit 0.0 gains as the plain modes', () => {
    const swapped: AasMatrix = {
      outputs: [{ output: 1, routes: [players('left', 2, 0), players('right', 1, 0.0)] }],
    }
    expect(matrixToMode(swapped)).toBe('swapped')
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
