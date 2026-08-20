import { describe, it, expect } from 'vitest'
import { formatSetupVersion } from '@/utils/setup-version'

describe('formatSetupVersion', () => {
  it('takes just the version out of the binary\'s --version line', () => {
    expect(
      formatSetupVersion(
        'soloist 1.3.7.423 build 1787221864 (20260820) (gb24005ef46) (linux/aarch64)',
      ),
    ).toBe('1.3.7.423')
  })

  it('passes through a string that is already just a version', () => {
    expect(formatSetupVersion('1.3.7.423')).toBe('1.3.7.423')
  })

  it('returns an unrecognised string rather than nothing', () => {
    expect(formatSetupVersion('something else entirely')).toBe('something else entirely')
  })

  it('is case-insensitive about the prefix', () => {
    expect(formatSetupVersion('Soloist 2.0.0 build 1')).toBe('2.0.0')
  })

  it('gives null for null, undefined and blank', () => {
    expect(formatSetupVersion(null)).toBeNull()
    expect(formatSetupVersion(undefined)).toBeNull()
    expect(formatSetupVersion('   ')).toBeNull()
  })
})

describe('formatSetupVersion without a known binary name', () => {
  it('still finds the version after an unknown leading word', () => {
    expect(formatSetupVersion('someplayer 4.5.6 build 9')).toBe('4.5.6')
  })

  it('uses the binary name when one is given', () => {
    expect(formatSetupVersion('soloist 1.2.3 build 9', 'soloist')).toBe('1.2.3')
  })

  it('ignores a binary name that does not match, falling back generically', () => {
    expect(formatSetupVersion('soloist 1.2.3 build 9', 'librespot')).toBe('1.2.3')
  })

  it('treats a regex-special binary name literally', () => {
    expect(formatSetupVersion('a.b 7.0', 'a.b')).toBe('7.0')
  })
})
