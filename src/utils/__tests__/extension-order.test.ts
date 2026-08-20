import { describe, it, expect } from 'vitest'
import { sortByUpgradeFirst } from '@/utils/extension-order'
import type { ExtensionState } from '@/api/extensions'

const e = (name: string, state: ExtensionState) => ({ name, state })
const names = (xs: { name: string }[]) => xs.map((x) => x.name)

describe('sortByUpgradeFirst', () => {
  it('lifts an upgradable entry to the top', () => {
    const out = sortByUpgradeFirst([
      e('AES67', 'available'),
      e('AirPlay', 'available'),
      e('Soloist', 'upgradable'),
    ])
    expect(names(out)[0]).toBe('Soloist')
  })

  it('keeps the incoming order among equals, so the rest stay alphabetical', () => {
    const out = sortByUpgradeFirst([
      e('AES67', 'available'),
      e('AirPlay', 'installed'),
      e('Analog', 'available'),
      e('LMS', 'installed'),
    ])
    expect(names(out)).toEqual(['AES67', 'AirPlay', 'Analog', 'LMS'])
  })

  it('keeps several upgradables in their incoming order, ahead of the rest', () => {
    const out = sortByUpgradeFirst([
      e('AES67', 'available'),
      e('AirPlay', 'upgradable'),
      e('LMS', 'installed'),
      e('Soloist', 'upgradable'),
    ])
    expect(names(out)).toEqual(['AirPlay', 'Soloist', 'AES67', 'LMS'])
  })

  it('ranks installed and available equally: neither outranks the other', () => {
    const out = sortByUpgradeFirst([e('B', 'installed'), e('A', 'available')])
    expect(names(out)).toEqual(['B', 'A'])
  })

  it('does not mutate its input', () => {
    const input = [e('A', 'available'), e('B', 'upgradable')]
    const copy = [...input]
    sortByUpgradeFirst(input)
    expect(input).toEqual(copy)
  })

  it('handles an empty list', () => {
    expect(sortByUpgradeFirst([])).toEqual([])
  })
})
