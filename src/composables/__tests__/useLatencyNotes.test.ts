import { describe, it, expect } from 'vitest'
import { cardLatencyNote, aes67LatencyNote, validLatency } from '@/composables/useLatencyNotes'

describe('cardLatencyNote', () => {
  it('warns strictly below the recommended and the lowest safe value', () => {
    expect(cardLatencyNote(5, 5, 3)).toBeNull()
    expect(cardLatencyNote(4, 5, 3)?.level).toBe('amber')
    expect(cardLatencyNote(3, 5, 3)?.level).toBe('amber')
    expect(cardLatencyNote(2, 5, 3)).toEqual({
      level: 'red',
      text: 'Too low for this device: expect dropouts.',
    })
  })

  it('uses the exact amber text', () => {
    expect(cardLatencyNote(4, 5, 3)).toEqual({
      level: 'amber',
      text: 'Lower than recommended: audio may drop out under heavy load.',
    })
  })

  it('says nothing without the board figures (older aas)', () => {
    expect(cardLatencyNote(2)).toBeNull()
  })
})

describe('aes67LatencyNote', () => {
  it('names the floor below it and nothing at or without it', () => {
    expect(aes67LatencyNote(5, 6)?.text).toBe('Too low for this device. AES67 uses 6 ms, the lowest it can handle.')
    expect(aes67LatencyNote(5, 6)?.level).toBe('amber')
    expect(aes67LatencyNote(6, 6)).toBeNull()
    expect(aes67LatencyNote(5)).toBeNull()
  })
})

describe('validLatency', () => {
  it('takes whole ms from 1 to 100 only', () => {
    for (const bad of [0, 101, 4.5, '6', null, undefined, NaN]) expect(validLatency(bad)).toBeNull()
    expect(validLatency(6)).toBe(6)
    expect(validLatency(1)).toBe(1)
    expect(validLatency(100)).toBe(100)
  })
})
