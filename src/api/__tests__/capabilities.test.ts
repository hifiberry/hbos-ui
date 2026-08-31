import { describe, it, expect, vi, beforeEach } from 'vitest'

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock('@/api/http', () => ({ apiFetch }))

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    getApiBaseUrl: () => 'http://192.168.1.12/api/audiocontrol',
  }),
}))

import { getCapabilities } from '@/api/capabilities'

describe('getCapabilities', () => {
  beforeEach(() => {
    apiFetch.mockReset()
  })

  it('returns the advertised image ladder', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ version: '0.12.0', images: { sizes: [100, 140, 200, 280, 400, 800] } }),
    })

    const capabilities = await getCapabilities()

    expect(capabilities?.images.sizes).toEqual([100, 140, 200, 280, 400, 800])
    expect(apiFetch).toHaveBeenCalledWith('http://192.168.1.12/api/audiocontrol/capabilities')
  })

  /** acr's own doc: "A release that answers this endpoint with 404 does not
   *  resize images. That is a complete answer - ask for originals rather than
   *  probing." */
  it('returns null when the daemon has no capabilities endpoint', async () => {
    apiFetch.mockResolvedValue({ ok: false, status: 404 })

    expect(await getCapabilities()).toBeNull()
  })

  it('returns null when the request fails outright', async () => {
    apiFetch.mockRejectedValue(new Error('device unreachable'))

    expect(await getCapabilities()).toBeNull()
  })
})
