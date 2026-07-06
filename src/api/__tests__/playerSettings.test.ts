import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({ getConfigApiBaseUrl: () => 'http://host/api/v1' }),
}))

import { saveExternalPlayerSettings } from '@/api/config'

describe('saveExternalPlayerSettings', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('PUTs values to the player settings endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await saveExternalPlayerSettings('analog-recognition', { songrec_enabled: false })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://host/api/v1/players/analog-recognition/settings',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songrec_enabled: false }),
      }),
    )
  })

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(
      saveExternalPlayerSettings('analog-recognition', { songrec_enabled: true }),
    ).rejects.toThrow()
  })
})
