import { describe, it, expect, vi, beforeEach } from 'vitest'

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock('@/api/http', () => ({ apiFetch }))

import { startSignIn, getSignInState, cancelSignIn, signOut } from '@/api/player-setup'

const res = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

describe('player setup sign-in API', () => {
  beforeEach(() => apiFetch.mockReset())

  it('startSignIn POSTs <base>/login and returns the code', async () => {
    apiFetch.mockResolvedValue(res(200, { code: '314359', expires_in: 300 }))
    await expect(startSignIn('/api/jellyfin')).resolves.toEqual({ code: '314359', expires_in: 300 })
    expect(apiFetch).toHaveBeenCalledWith('/api/jellyfin/login', { method: 'POST' })
  })

  it('startSignIn surfaces the provider error text', async () => {
    apiFetch.mockResolvedValue(res(409, { error: 'Quick Connect is disabled on the server' }))
    await expect(startSignIn('/api/jellyfin')).rejects.toThrow('Quick Connect is disabled on the server')
  })

  it('startSignIn falls back to the status when the body has no error', async () => {
    apiFetch.mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error('x') } })
    await expect(startSignIn('/api/jellyfin')).rejects.toThrow('502')
  })

  it('getSignInState GETs <base>/login', async () => {
    apiFetch.mockResolvedValue(res(200, { state: 'waiting', code: '1', error: null }))
    await expect(getSignInState('/api/jellyfin')).resolves.toMatchObject({ state: 'waiting' })
    expect(apiFetch).toHaveBeenCalledWith('/api/jellyfin/login', undefined)
  })

  it('cancelSignIn DELETEs and signOut POSTs logout', async () => {
    apiFetch.mockResolvedValue(res(204, null))
    await cancelSignIn('/api/jellyfin')
    expect(apiFetch).toHaveBeenLastCalledWith('/api/jellyfin/login', { method: 'DELETE' })
    await signOut('/api/jellyfin')
    expect(apiFetch).toHaveBeenLastCalledWith('/api/jellyfin/logout', { method: 'POST' })
  })

  it('signOut surfaces the provider error text', async () => {
    apiFetch.mockResolvedValue(res(500, { error: 'boom' }))
    await expect(signOut('/api/jellyfin')).rejects.toThrow('boom')
  })
})
