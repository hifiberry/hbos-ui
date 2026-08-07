import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    getConfigApiBaseUrl: () => 'http://host/api/config/v1',
  }),
}))

import { getSupportInfo } from '@/api/config'

const textResponse = (status: number, body: string) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  headers: new Headers({ 'Content-Type': 'text/plain' }),
  text: async () => body,
})

describe('getSupportInfo', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('requests the supportinfo endpoint and returns the body as text', async () => {
    const fetchMock = vi.fn().mockResolvedValue(textResponse(200, '## System\nPi Model: Pi 5\n'))
    vi.stubGlobal('fetch', fetchMock)

    const report = await getSupportInfo()

    expect(report).toContain('Pi Model: Pi 5')
    expect(fetchMock.mock.calls[0][0]).toBe('http://host/api/config/v1/supportinfo')
  })

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse(500, 'nope')))
    await expect(getSupportInfo()).rejects.toThrow(/500/)
  })
})
