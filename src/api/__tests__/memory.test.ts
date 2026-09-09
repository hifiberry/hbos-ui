import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/api/http', () => ({ apiFetch: vi.fn() }))

import { apiFetch } from '@/api/http'
import { getMemoryUsage } from '@/api/memory'

const report = {
  system: { total_kb: 2027104, free_kb: 400000, available_kb: 812340, used_kb: 1214764,
            cached_kb: 210400, buffers_kb: 18200, swap_total_kb: 0, swap_used_kb: 0,
            process_pss_kb: 900000, unaccounted_kb: 0 },
  features: [],
}

describe('getMemoryUsage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(apiFetch).mockReset()
  })

  it('returns the parsed report', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, json: async () => report } as Response)
    expect(await getMemoryUsage()).toEqual(report)
  })

  it('requests the memory endpoint', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, json: async () => report } as Response)
    await getMemoryUsage()
    expect(vi.mocked(apiFetch).mock.calls[0][0]).toContain('/memory')
  })

  it('returns null when the endpoint is unavailable', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: false, status: 503, statusText: 'x' } as Response)
    expect(await getMemoryUsage()).toBeNull()
  })

  it('returns null when the request throws', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('offline'))
    expect(await getMemoryUsage()).toBeNull()
  })
})
