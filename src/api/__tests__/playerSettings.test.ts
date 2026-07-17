import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({ getConfigApiBaseUrl: () => 'http://host/api/v1' }),
}))

import { saveExternalPlayerSettings } from '@/api/config'

describe('saveExternalPlayerSettings', () => {
  beforeEach(() => {
    // Routed through apiFetch (@/api/http), which needs an active Pinia
    // to read the auth store's cached csrf token.
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('PUTs values to the player settings endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await saveExternalPlayerSettings('analog-recognition', { songrec_enabled: false })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://host/api/v1/players/analog-recognition/settings')
    expect(init.method).toBe('PUT')
    expect((init.headers as Headers).get('Content-Type')).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ songrec_enabled: false }))
  })

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(
      saveExternalPlayerSettings('analog-recognition', { songrec_enabled: true }),
    ).rejects.toThrow()
  })
})
