import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({ getDSPToolkitApiBaseUrl: () => 'http://host/api/dsptoolkit' }),
}))

const apiFetch = vi.fn()
vi.mock('@/api/http', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }))

import { setFilterBank, BankEndpointUnavailableError } from '@/api/dsptoolkit'

const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => body,
  text: async () => JSON.stringify(body),
})

const sixteenSlots = Array.from({ length: 16 }, (_, i) => ({
  offset: i,
  filter: { type: 'PeakingEq' as const, f: 100 * (i + 1), db: -3, q: 1 },
}))

describe('setFilterBank', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiFetch.mockReset()
  })

  it('sends the whole bank in a single POST to /filters/bank', async () => {
    apiFetch.mockResolvedValue(jsonResponse(200, {
      status: 'success', address: 'bankLeft', checksum: 'ABC',
      sampleRate: 48000, written: 16, total: 16, results: [],
    }))

    const result = await setFilterBank({ address: 'bankLeft', filters: sixteenSlots, sampleRate: 48000 })

    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [url, options] = apiFetch.mock.calls[0]
    expect(url).toBe('http://host/api/dsptoolkit/filters/bank')
    expect(options.method).toBe('POST')
    const body = JSON.parse(options.body)
    expect(body.address).toBe('bankLeft')
    expect(body.filters).toHaveLength(16)
    expect(body.filters[3]).toEqual({ offset: 3, filter: { type: 'PeakingEq', f: 400, db: -3, q: 1 } })
    expect(result.written).toBe(16)
  })

  it('throws BankEndpointUnavailableError on 404 so callers can fall back', async () => {
    apiFetch.mockResolvedValue(jsonResponse(404, { error: 'Not Found' }))

    await expect(setFilterBank({ address: 'bankLeft', filters: sixteenSlots }))
      .rejects.toBeInstanceOf(BankEndpointUnavailableError)
  })

  it('surfaces a partial write as an error rather than reporting success', async () => {
    apiFetch.mockResolvedValue(jsonResponse(207, {
      status: 'partial', address: 'bankLeft', checksum: 'ABC', sampleRate: 48000,
      written: 15, total: 16, results: [], errors: ['offset 7: simulated SPI failure'],
    }))

    await expect(setFilterBank({ address: 'bankLeft', filters: sixteenSlots }))
      .rejects.toThrow(/offset 7/)
  })
})
