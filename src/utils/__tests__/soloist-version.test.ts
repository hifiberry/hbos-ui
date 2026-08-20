import { describe, it, expect } from 'vitest'
import { formatSoloistVersion } from '@/utils/soloist-version'

describe('formatSoloistVersion', () => {
  it('takes just the version out of the binary\'s --version line', () => {
    expect(
      formatSoloistVersion(
        'soloist 1.3.7.423 build 1787221864 (20260820) (gb24005ef46) (linux/aarch64)',
      ),
    ).toBe('1.3.7.423')
  })

  it('passes through a string that is already just a version', () => {
    expect(formatSoloistVersion('1.3.7.423')).toBe('1.3.7.423')
  })

  it('returns an unrecognised string rather than nothing', () => {
    expect(formatSoloistVersion('something else entirely')).toBe('something else entirely')
  })

  it('is case-insensitive about the prefix', () => {
    expect(formatSoloistVersion('Soloist 2.0.0 build 1')).toBe('2.0.0')
  })

  it('gives null for null, undefined and blank', () => {
    expect(formatSoloistVersion(null)).toBeNull()
    expect(formatSoloistVersion(undefined)).toBeNull()
    expect(formatSoloistVersion('   ')).toBeNull()
  })
})
