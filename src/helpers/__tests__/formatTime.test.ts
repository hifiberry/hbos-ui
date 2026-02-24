import { describe, it, expect } from 'vitest'
import { formatTime } from '../formatTime'

describe('formatTime', () => {
  it('returns 00:00 for null', () => {
    expect(formatTime(null)).toBe('00:00')
  })

  it('returns 00:00 for undefined', () => {
    expect(formatTime(undefined)).toBe('00:00')
  })

  it('returns 00:00 for zero', () => {
    expect(formatTime(0)).toBe('00:00')
  })

  it('formats seconds under a minute', () => {
    expect(formatTime(5)).toBe('00:05')
    expect(formatTime(30)).toBe('00:30')
    expect(formatTime(59)).toBe('00:59')
  })

  it('formats minutes and seconds', () => {
    expect(formatTime(60)).toBe('01:00')
    expect(formatTime(90)).toBe('01:30')
    expect(formatTime(3599)).toBe('59:59')
  })

  it('formats hours, minutes and seconds', () => {
    expect(formatTime(3600)).toBe('01:00:00')
    expect(formatTime(3661)).toBe('01:01:01')
    expect(formatTime(7200)).toBe('02:00:00')
    expect(formatTime(86399)).toBe('23:59:59')
  })

  it('floors fractional seconds', () => {
    expect(formatTime(1.9)).toBe('00:01')
    expect(formatTime(59.999)).toBe('00:59')
    expect(formatTime(90.5)).toBe('01:30')
  })

  it('pads single digits with leading zero', () => {
    expect(formatTime(1)).toBe('00:01')
    expect(formatTime(61)).toBe('01:01')
    expect(formatTime(3661)).toBe('01:01:01')
  })
})
