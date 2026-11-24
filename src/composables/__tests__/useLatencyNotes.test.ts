import { describe, it, expect } from 'vitest'
import { cardLatencyNote, aes67LatencyNote, validLatency } from '@/composables/useLatencyNotes'

describe('cardLatencyNote', () => {
  it('warns strictly below the recommended and the lowest safe value', () => {
    expect(cardLatencyNote(5, 5, 3)).toBeNull()
    expect(cardLatencyNote(4, 5, 3)?.level).toBe('amber')
    expect(cardLatencyNote(3, 5, 3)?.level).toBe('amber')
    expect(cardLatencyNote(2, 5, 3)).toEqual({
      level: 'red',
      text: 'Below what this board handles: dropouts are likely.',
    })
  })

  it('uses the exact amber text', () => {
    expect(cardLatencyNote(4, 5, 3)).toEqual({
      level: 'amber',
      text: 'Lower than recommended for this board: it may drop out under heavy load.',
    })
  })

  it('says nothing without the board figures (older aas)', () => {
    expect(cardLatencyNote(2)).toBeNull()
  })
})

describe('aes67LatencyNote', () => {
  it('names the floor below it and nothing at or without it', () => {
    expect(aes67LatencyNote(5, 6)?.text).toBe('This board holds at least 6 ms; the stream plays at 6 ms.')
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
