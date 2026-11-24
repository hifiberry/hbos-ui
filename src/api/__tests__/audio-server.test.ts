import { describe, it, expect, vi, beforeEach } from 'vitest'

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock('@/api/http', () => ({ apiFetch }))
vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({ getConfigApiBaseUrl: () => 'http://dev/api/config/v1' }),
}))

import { getAudioServer, setAudioServer, getAasLatency, setAasLatency } from '@/api/audio-server'

describe('audio-server api', () => {
  beforeEach(() => {
    apiFetch.mockReset()
  })

  it('getAudioServer unwraps data', async () => {
    const data = { running: 'aas', chosen: 'aas', available: true }
    apiFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: 'success', data }) })
    expect(await getAudioServer()).toEqual(data)
    const [url, init] = apiFetch.mock.calls[0]
    expect(url).toBe('http://dev/api/config/v1/audio-server')
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('setAudioServer POSTs {server}', async () => {
    const data = { running: 'pipewire', chosen: 'aas', available: true, reboot_required: true }
    apiFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: 'success', data }) })
    expect(await setAudioServer('aas')).toEqual(data)
    const [url, init] = apiFetch.mock.calls[0]
    expect(url).toBe('http://dev/api/config/v1/audio-server')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ server: 'aas' })
  })

  it('returns an ApiError with the route message on 409', async () => {
    apiFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ status: 'error', message: 'not installed' }),
    })
    expect(await setAudioServer('aas')).toEqual({ error: 'HTTP 409', message: 'not installed' })
  })

  it('returns an ApiError when the request throws', async () => {
    apiFetch.mockRejectedValue(new Error('down'))
    expect(await getAudioServer()).toEqual({ error: 'Network Error', message: 'down' })
  })

  it('getAasLatency unwraps data from /audio-server/aas-settings', async () => {
    apiFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: 'success', data: { latency_ms: null } }) })
    expect(await getAasLatency()).toEqual({ latency_ms: null })
    expect(apiFetch.mock.calls[0][0]).toBe('http://dev/api/config/v1/audio-server/aas-settings')
  })

  it('setAasLatency POSTs {latency_ms}', async () => {
    const data = { latency_ms: 30, restarted: true }
    apiFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: 'success', data }) })
    expect(await setAasLatency(30)).toEqual(data)
    const [url, init] = apiFetch.mock.calls[0]
    expect(url).toBe('http://dev/api/config/v1/audio-server/aas-settings')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ latency_ms: 30 })
  })

  it('setAasLatency returns an ApiError on 400', async () => {
    apiFetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({ status: 'error', message: 'bad' }) })
    expect(await setAasLatency(1)).toEqual({ error: 'HTTP 400', message: 'bad' })
  })
})
