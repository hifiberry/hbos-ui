import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'

const { getSetupStatus } = vi.hoisted(() => ({ getSetupStatus: vi.fn() }))
vi.mock('@/api/player-setup', () => ({ getSetupStatus }))

import { usePlayerSetup } from '@/composables/usePlayerSetup'

const status = (over = {}) => ({
  binary_installed: true,
  version: '1.0',
  build_date: null,
  expires_on: null,
  bridge_connected: false,
  logged_in: false,
  is_active: false,
  device_name: null,
  ...over,
})

// A macrotask tick as well as the microtasks: the immediate watcher starts
// its fetch during construction, so the rejection settles after this frame.
const flush = async () => {
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
}

describe('usePlayerSetup', () => {
  beforeEach(() => getSetupStatus.mockReset())

  it('is incomplete when the binary is missing', async () => {
    getSetupStatus.mockResolvedValue(status({ binary_installed: false }))
    const s = usePlayerSetup(ref('/api/x'), ref(true))
    await flush()
    expect(s.setupIncomplete.value).toBe(true)
    expect(s.needsBinary.value).toBe(true)
  })

  it('is incomplete when a credential is missing', async () => {
    getSetupStatus.mockResolvedValue(status())
    const s = usePlayerSetup(ref('/api/x'), ref(false))
    await flush()
    expect(s.setupIncomplete.value).toBe(true)
    expect(s.needsBinary.value).toBe(false)
  })

  it('is complete when the binary and credentials are both there', async () => {
    getSetupStatus.mockResolvedValue(status())
    const s = usePlayerSetup(ref('/api/x'), ref(true))
    await flush()
    expect(s.setupIncomplete.value).toBe(false)
  })

  // The important one: not knowing must never be treated as knowing it fails,
  // or an unreachable provider disables a toggle that would have worked.
  it('stays unknown when the provider is unreachable', async () => {
    getSetupStatus.mockRejectedValueOnce(new Error('Setup API request failed: 502'))
    const s = usePlayerSetup(ref('/api/x'), ref(false))
    await flush()
    expect(s.setupIncomplete.value).toBeNull()
    expect(s.error.value).toContain('502')
  })

  it('stays unknown for a player that declares no setup, and asks nothing', async () => {
    const s = usePlayerSetup(ref(null), ref(false))
    await flush()
    expect(s.setupIncomplete.value).toBeNull()
    expect(getSetupStatus).not.toHaveBeenCalled()
  })

  it('keeps the last known status when a later request fails', async () => {
    getSetupStatus.mockResolvedValueOnce(status({ binary_installed: true }))
    const s = usePlayerSetup(ref('/api/x'), ref(true))
    await flush()
    getSetupStatus.mockRejectedValueOnce(new Error('blip'))
    await s.refresh()
    await flush()
    expect(s.status.value?.binary_installed).toBe(true)
    expect(s.setupIncomplete.value).toBe(false)
  })
})
