import { describe, it, expect, vi, beforeEach } from 'vitest'

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock('@/api/http', () => ({ apiFetch }))
vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({ getAasApiBaseUrl: () => 'http://dev/api/aas/v1' }),
}))

import { getState, getPlugins, setPluginParams, getMatrix, putMatrix, getOutput, setOutputLimit } from '@/api/aas'

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body })

describe('aas api', () => {
  beforeEach(() => {
    apiFetch.mockReset()
  })

  it('getState and getPlugins and getMatrix GET their paths', async () => {
    apiFetch.mockResolvedValue(ok({ a: 1 }))
    expect(await getState()).toEqual({ a: 1 })
    await getPlugins()
    await getMatrix()
    expect(apiFetch.mock.calls.map((c) => c[0])).toEqual([
      'http://dev/api/aas/v1/state',
      'http://dev/api/aas/v1/plugins',
      'http://dev/api/aas/v1/matrix',
    ])
    expect(apiFetch.mock.calls[0][1]).toBeUndefined()
  })

  it('setPluginParams PATCHes the plugin id with {params}', async () => {
    apiFetch.mockResolvedValue(ok({}))
    await setPluginParams('1/output/0', { balance: 0.5 })
    const [url, init] = apiFetch.mock.calls[0]
    expect(url).toBe('http://dev/api/aas/v1/plugins/1/output/0')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body)).toEqual({ params: { balance: 0.5 } })
  })

  it('putMatrix PUTs the matrix', async () => {
    apiFetch.mockResolvedValue(ok({}))
    const matrix = { outputs: [{ output: 1, routes: [{ from: 'players.left', to: 1, gain_db: -6 }] }] }
    await putMatrix(matrix)
    const [url, init] = apiFetch.mock.calls[0]
    expect(url).toBe('http://dev/api/aas/v1/matrix')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual(matrix)
  })

  it('getOutput GETs the output by its number', async () => {
    apiFetch.mockResolvedValue(ok({ id: 1, volume: 43, limit_db: -6 }))
    expect(await getOutput(1)).toEqual({ id: 1, volume: 43, limit_db: -6 })
    expect(apiFetch.mock.calls[0][0]).toBe('http://dev/api/aas/v1/outputs/1')
  })

  it('setOutputLimit PATCHes the master with {limit_db}', async () => {
    apiFetch.mockResolvedValue(ok({ id: 1, limit_db: -12 }))
    expect(await setOutputLimit(-12)).toEqual({ id: 1, limit_db: -12 })
    const [url, init] = apiFetch.mock.calls[0]
    expect(url).toBe('http://dev/api/aas/v1/outputs/1')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body)).toEqual({ limit_db: -12 })
  })

  it('returns an ApiError for a failed status', async () => {
    apiFetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({ message: 'bad' }) })
    expect(await getMatrix()).toEqual({ error: 'HTTP 400', message: 'bad' })
  })

  it('returns an ApiError when the request throws', async () => {
    apiFetch.mockRejectedValue(new Error('unreachable'))
    expect(await getState()).toEqual({ error: 'Network Error', message: 'unreachable' })
  })
})
