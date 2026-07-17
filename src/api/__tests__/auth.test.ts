import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  AuthApiError,
  getAuthStatus,
  getCsrf,
  login,
  logout,
  setPassword,
  setPolicy,
} from '@/api/auth'

const ok = (data: unknown) => vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => data })

describe('auth api', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('gets status same-origin with credentials', async () => {
    const fetchMock = ok({ protection: 'risky', has_password: true, authenticated: false })
    vi.stubGlobal('fetch', fetchMock)

    const result = await getAuthStatus()

    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/api/auth/status`,
      expect.objectContaining({ credentials: 'same-origin' }),
    )
    expect(result.protection).toBe('risky')
  })

  it('POSTs login with password and remember', async () => {
    const fetchMock = ok({ csrf: 'tok' })
    vi.stubGlobal('fetch', fetchMock)

    const result = await login('secret', true)

    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/api/auth/login`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ password: 'secret', remember: true }),
      }),
    )
    expect(result.csrf).toBe('tok')
  })

  it('POSTs set-password including current when changing an existing password', async () => {
    const fetchMock = ok({ csrf: 'tok2' })
    vi.stubGlobal('fetch', fetchMock)

    await setPassword('newpass', 'oldpass', false)

    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/api/auth/set-password`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ password: 'newpass', current: 'oldpass', remember: false }),
      }),
    )
  })

  it('POSTs logout with the CSRF header when a token is supplied', async () => {
    const fetchMock = ok({})
    vi.stubGlobal('fetch', fetchMock)

    await logout('csrf-tok')

    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/api/auth/logout`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-tok' }),
      }),
    )
  })

  it('POSTs policy with protection and CSRF header', async () => {
    const fetchMock = ok({})
    vi.stubGlobal('fetch', fetchMock)

    await setPolicy('all', 'csrf-tok')

    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/api/auth/policy`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-tok' }),
        body: JSON.stringify({ protection: 'all' }),
      }),
    )
  })

  it('gets a fresh csrf token', async () => {
    const fetchMock = ok({ csrf: 'tok3' })
    vi.stubGlobal('fetch', fetchMock)

    const result = await getCsrf()

    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/api/auth/csrf`,
      expect.objectContaining({ credentials: 'same-origin' }),
    )
    expect(result.csrf).toBe('tok3')
  })

  it('throws AuthApiError with status on a 401 (wrong password)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'wrong password' }),
      }),
    )

    await expect(login('nope')).rejects.toMatchObject({
      status: 401,
      message: 'wrong password',
    })
  })

  it('throws AuthApiError with status on a 429 (rate limited)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ message: 'too many attempts' }),
      }),
    )

    const error = await login('nope').catch((e) => e)
    expect(error).toBeInstanceOf(AuthApiError)
    expect(error.status).toBe(429)
  })
})
