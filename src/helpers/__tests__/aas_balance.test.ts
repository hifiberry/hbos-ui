import { describe, it, expect } from 'vitest'
import { findBalancePlugin } from '@/helpers/aas_balance'
import type { AasPlugin } from '@/api/aas'

const plugin = (id: string, type: AasPlugin['type'] = 'balance', enabled = true): AasPlugin => ({
  id, type, name: id, enabled, neutral: true, latency_frames: 0, params: [],
})

describe('findBalancePlugin', () => {
  it('prefers the output stage over the mix stage', () => {
    const plugins = [plugin('1/mix/0'), plugin('1/output/0')]
    expect(findBalancePlugin(plugins)?.id).toBe('1/output/0')
  })

  it('falls back to the mix stage', () => {
    expect(findBalancePlugin([plugin('1/mix/0')])?.id).toBe('1/mix/0')
  })

  it('never takes the analog stage', () => {
    expect(findBalancePlugin([plugin('1/analog/0')])).toBeNull()
  })

  it('ignores other plugin types and other outputs', () => {
    expect(findBalancePlugin([plugin('1/output/0', 'detect'), plugin('2/output/0')])).toBeNull()
  })

  it('returns a disabled plugin as it is', () => {
    expect(findBalancePlugin([plugin('1/output/0', 'balance', false)])?.enabled).toBe(false)
  })
})
