import { describe, it, expect } from 'vitest'
import { parseAasLevels } from '@/helpers/aas_levels'

const frame = (...bytes: number[]) => new Uint8Array(bytes).buffer

describe('parseAasLevels', () => {
  it('reads a stereo master alone with its clip bits', () => {
    expect(parseAasLevels(frame(1, 2, 10, 20, 30, 40, 0b10))).toEqual({
      leftRms: 10, leftPeak: 20, rightRms: 30, rightPeak: 40,
      leftClipping: false, rightClipping: true,
    })
  })

  it('finds meter 1 after an analog meter', () => {
    const r = parseAasLevels(frame(16, 2, 1, 2, 3, 4, 0, 1, 2, 50, 60, 70, 80, 1))
    expect(r).toMatchObject({ leftRms: 50, rightPeak: 80, leftClipping: true, rightClipping: false })
  })

  it('finds meter 1 when it comes first and others follow', () => {
    const r = parseAasLevels(frame(1, 2, 5, 6, 7, 8, 3, 2, 2, 9, 9, 9, 9, 0))
    expect(r).toMatchObject({ leftRms: 5, rightRms: 7 })
  })

  it('shows a mono master on both sides', () => {
    expect(parseAasLevels(frame(1, 1, 100, 110, 1))).toEqual({
      leftRms: 100, leftPeak: 110, rightRms: 100, rightPeak: 110,
      leftClipping: true, rightClipping: true,
    })
  })

  it('returns null without meter 1 or on a truncated frame', () => {
    expect(parseAasLevels(frame(16, 2, 1, 2, 3, 4, 0))).toBeNull()
    expect(parseAasLevels(frame(1, 2, 1, 2))).toBeNull()
    expect(parseAasLevels(frame())).toBeNull()
  })
})
