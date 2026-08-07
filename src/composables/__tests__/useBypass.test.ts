import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// vi.mock factories are hoisted above top-level const/class declarations, so a
// factory that closes over a plain top-level const hits a temporal dead zone
// at runtime. vi.hoisted() lifts the binding itself above that point.
const { setFilterBankBypassState } = vi.hoisted(() => ({ setFilterBankBypassState: vi.fn() }))
vi.mock('@/api/dsptoolkit', () => ({
  setFilterBankBypassState: (...args: unknown[]) => setFilterBankBypassState(...args),
}))

import { useBypass } from '@/composables/useBypass'

/**
 * The bypass control is press-and-hold: mousedown -> startBypass,
 * mouseup -> endBypass. A quick tap fires both in immediate succession.
 * endBypass() only guarded on isBypassed, which startBypass() sets *before*
 * awaiting its writes -- so the bypass-OFF requests raced the still-in-flight
 * bypass-ON requests to the same live hardware registers (hifiberry-os#626).
 */
describe('useBypass', () => {
  beforeEach(() => {
    setFilterBankBypassState.mockReset()
  })

  it('does not overlap the bypass-off writes with the bypass-on writes', async () => {
    const events: string[] = []
    const resolvers: Array<() => void> = []

    setFilterBankBypassState.mockImplementation((bank: string, bypassed: boolean) => {
      events.push(`start:${bank}:${bypassed}`)
      return new Promise<void>((resolve) => {
        resolvers.push(() => {
          events.push(`end:${bank}:${bypassed}`)
          resolve()
        })
      })
    })

    const { startBypass, endBypass, isBypassed } = useBypass(() => ['left', 'right'], ref(false))

    const started = startBypass()
    const ended = endBypass()            // quick tap: not awaited in between

    // Only the bypass-ON writes may be in flight at this point.
    await Promise.resolve()
    expect(events.filter((e) => e.startsWith('start:'))).toEqual([
      'start:left:true',
      'start:right:true',
    ])

    resolvers.splice(0).forEach((r) => r())
    await started

    // Now the bypass-OFF writes may go out.
    await Promise.resolve()
    expect(events.filter((e) => e.includes(':false'))).toHaveLength(2)

    resolvers.splice(0).forEach((r) => r())
    await ended

    expect(isBypassed.value).toBe(false)

    const firstOff = events.findIndex((e) => e.startsWith('start:') && e.endsWith(':false'))
    const lastOn = events.map((e) => e.startsWith('end:') && e.endsWith(':true')).lastIndexOf(true)
    expect(firstOff).toBeGreaterThan(lastOn)
  })

  it('leaves the banks un-bypassed after a quick tap', async () => {
    setFilterBankBypassState.mockResolvedValue(undefined)

    const { startBypass, endBypass, isBypassed } = useBypass(() => ['left', 'right'], ref(false))

    await Promise.all([startBypass(), endBypass()])

    expect(isBypassed.value).toBe(false)
    const lastCallsPerBank = new Map<string, boolean>()
    for (const [bank, bypassed] of setFilterBankBypassState.mock.calls) {
      lastCallsPerBank.set(bank as string, bypassed as boolean)
    }
    expect([...lastCallsPerBank.values()]).toEqual([false, false])
  })

  it('ignores a press while a filter is being dragged', async () => {
    setFilterBankBypassState.mockResolvedValue(undefined)

    const { startBypass, isBypassed } = useBypass(() => ['left'], ref(true))

    await startBypass()

    expect(setFilterBankBypassState).not.toHaveBeenCalled()
    expect(isBypassed.value).toBe(false)
  })
})
