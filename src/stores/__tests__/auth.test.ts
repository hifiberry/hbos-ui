import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { getAuthStatus, getCsrf, login, logout, setPassword, setPolicy } = vi.hoisted(() => ({
  getAuthStatus: vi.fn(),
  getCsrf: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  setPassword: vi.fn(),
  setPolicy: vi.fn(),
}))

vi.mock('@/api/auth', async () => {
  const actual = await vi.importActual<typeof import('@/api/auth')>('@/api/auth')
  return {
    ...actual,
    getAuthStatus,
    getCsrf,
    login,
    logout,
    setPassword,
    setPolicy,
  }
})

import { useAuthStore } from '@/stores/auth'
import { AuthApiError } from '@/api/auth'

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    getAuthStatus.mockReset()
    getCsrf.mockReset()
    login.mockReset()
    logout.mockReset()
    setPassword.mockReset()
    setPolicy.mockReset()
  })

  it('refreshStatus stores the result', async () => {
    getAuthStatus.mockResolvedValue({ protection: 'risky', has_password: true, authenticated: false })
    const store = useAuthStore()

    const result = await store.refreshStatus()

    expect(result.protection).toBe('risky')
    expect(store.status?.protection).toBe('risky')
  })

  it('login caches the csrf token and refreshes status', async () => {
    login.mockResolvedValue({ csrf: 'tok-1' })
    getAuthStatus.mockResolvedValue({ protection: 'risky', has_password: true, authenticated: true })
    const store = useAuthStore()

    await store.login('secret', true)

    expect(login).toHaveBeenCalledWith('secret', true)
    expect(store.csrf).toBe('tok-1')
    expect(store.status?.authenticated).toBe(true)
  })

  it('setPassword caches the csrf token and refreshes status', async () => {
    setPassword.mockResolvedValue({ csrf: 'tok-2' })
    getAuthStatus.mockResolvedValue({ protection: 'risky', has_password: true, authenticated: true })
    const store = useAuthStore()

    await store.setPassword('newpass', undefined, false)

    expect(setPassword).toHaveBeenCalledWith('newpass', undefined, false)
    expect(store.csrf).toBe('tok-2')
  })

  it('logout sends the cached csrf, clears it, and refreshes status', async () => {
    login.mockResolvedValue({ csrf: 'tok-3' })
    logout.mockResolvedValue(undefined)
    getAuthStatus.mockResolvedValue({ protection: 'risky', has_password: true, authenticated: false })
    const store = useAuthStore()
    await store.login('secret')

    await store.logout()

    expect(logout).toHaveBeenCalledWith('tok-3')
    expect(store.csrf).toBeNull()
  })

  it('logout rehydrates the csrf token when none is cached', async () => {
    getCsrf.mockResolvedValue({ csrf: 'tok-rehydrated' })
    logout.mockResolvedValue(undefined)
    getAuthStatus.mockResolvedValue({ protection: 'risky', has_password: true, authenticated: false })
    const store = useAuthStore()
    // no login(): this is the post-reload state — cookie alive, token gone
    expect(store.csrf).toBeNull()

    await store.logout()

    expect(getCsrf).toHaveBeenCalled()
    expect(logout).toHaveBeenCalledWith('tok-rehydrated')
    expect(store.csrf).toBeNull()
  })

  it('logout does not refetch a token it already has', async () => {
    login.mockResolvedValue({ csrf: 'tok-5' })
    logout.mockResolvedValue(undefined)
    getAuthStatus.mockResolvedValue({ protection: 'risky', has_password: true, authenticated: false })
    const store = useAuthStore()
    await store.login('secret')

    await store.logout()

    expect(getCsrf).not.toHaveBeenCalled()
    expect(logout).toHaveBeenCalledWith('tok-5')
  })

  it('logout propagates a server refusal instead of reporting success', async () => {
    login.mockResolvedValue({ csrf: 'tok-6' })
    logout.mockRejectedValue(new Error('HTTP 401'))
    getAuthStatus.mockResolvedValue({ protection: 'risky', has_password: true, authenticated: true })
    const store = useAuthStore()
    await store.login('secret')

    await expect(store.logout()).rejects.toThrow('HTTP 401')
  })

  it('logout retries once after re-fetching a stale token, and succeeds', async () => {
    login.mockResolvedValue({ csrf: 'tok-stale-7' })
    getAuthStatus.mockResolvedValue({ protection: 'risky', has_password: true, authenticated: false })
    getCsrf.mockResolvedValue({ csrf: 'tok-fresh-7' })
    logout
      .mockRejectedValueOnce(new AuthApiError(401, 'stale csrf'))
      .mockResolvedValueOnce(undefined)
    const store = useAuthStore()
    await store.login('secret')

    await store.logout()

    expect(logout).toHaveBeenNthCalledWith(1, 'tok-stale-7')
    expect(getCsrf).toHaveBeenCalled()
    expect(logout).toHaveBeenNthCalledWith(2, 'tok-fresh-7')
    expect(logout).toHaveBeenCalledTimes(2)
    expect(store.csrf).toBeNull()
  })

  it('logout propagates the error when the retry after rehydrating also fails', async () => {
    login.mockResolvedValue({ csrf: 'tok-stale-8' })
    getAuthStatus.mockResolvedValue({ protection: 'risky', has_password: true, authenticated: false })
    getCsrf.mockResolvedValue({ csrf: 'tok-fresh-8' })
    const secondError = new AuthApiError(401, 'session gone')
    logout
      .mockRejectedValueOnce(new AuthApiError(401, 'stale csrf'))
      .mockRejectedValueOnce(secondError)
    const store = useAuthStore()
    await store.login('secret')

    await expect(store.logout()).rejects.toBe(secondError)

    expect(logout).toHaveBeenCalledTimes(2)
    expect(store.csrf).toBeNull()
  })

  it('logout keeps the cached token when the failure is not a 401', async () => {
    login.mockResolvedValue({ csrf: 'tok-9' })
    getAuthStatus.mockResolvedValue({ protection: 'risky', has_password: true, authenticated: true })
    const serverError = new AuthApiError(500, 'boom')
    logout.mockRejectedValue(serverError)
    const store = useAuthStore()
    await store.login('secret')

    await expect(store.logout()).rejects.toBe(serverError)

    // The session is still alive and the token is still valid; discarding it
    // would break the next write that needs one.
    expect(store.csrf).toBe('tok-9')
    expect(getCsrf).not.toHaveBeenCalled()
  })

  it('logout does not mint a second token when the one it just fetched is refused', async () => {
    getAuthStatus.mockResolvedValue({ protection: 'risky', has_password: true, authenticated: true })
    getCsrf.mockResolvedValue({ csrf: 'tok-fresh-10' })
    const refused = new AuthApiError(401, 'refused')
    logout.mockRejectedValue(refused)
    const store = useAuthStore()
    // Post-reload state: cookie alive, no token in memory.
    expect(store.csrf).toBeNull()

    await expect(store.logout()).rejects.toBe(refused)

    // /api/auth/csrf only answers for a valid session, so this 401 is the
    // daemon refusing a token it had just issued — not an expiry. One mint is
    // enough, and the error must not be swallowed.
    expect(getCsrf).toHaveBeenCalledTimes(1)
    expect(logout).toHaveBeenCalledTimes(1)
    expect(store.csrf).toBeNull()
  })

  it('logout resolves when the session turns out to be gone already', async () => {
    login.mockResolvedValue({ csrf: 'tok-11' })
    getAuthStatus.mockResolvedValue({ protection: 'risky', has_password: true, authenticated: false })
    logout.mockRejectedValue(new AuthApiError(401, 'no session'))
    getCsrf.mockRejectedValue(new AuthApiError(401, 'no session'))
    const store = useAuthStore()
    await store.login('secret')

    // Nothing left to end, so signing out succeeded as far as the user cares.
    await expect(store.logout()).resolves.toBeUndefined()

    expect(logout).toHaveBeenCalledTimes(1)
    expect(store.csrf).toBeNull()
  })

  it('setPolicy sends the cached csrf and refreshes status', async () => {
    login.mockResolvedValue({ csrf: 'tok-4' })
    setPolicy.mockResolvedValue(undefined)
    getAuthStatus.mockResolvedValue({ protection: 'all', has_password: true, authenticated: true })
    const store = useAuthStore()
    await store.login('secret')

    await store.setPolicy('all')

    expect(setPolicy).toHaveBeenCalledWith('all', 'tok-4')
    expect(store.status?.protection).toBe('all')
  })

  it('ensureCsrf caches a freshly fetched token and reports success', async () => {
    getCsrf.mockResolvedValue({ csrf: 'tok-fresh' })
    const store = useAuthStore()

    const ok = await store.ensureCsrf()

    expect(ok).toBe(true)
    expect(store.csrf).toBe('tok-fresh')
  })

  it('ensureCsrf clears the token and reports failure when the session is gone', async () => {
    login.mockResolvedValue({ csrf: 'tok-stale' })
    getAuthStatus.mockResolvedValue({ protection: 'risky', has_password: true, authenticated: true })
    getCsrf.mockRejectedValue(new Error('401'))
    const store = useAuthStore()
    await store.login('secret')
    expect(store.csrf).toBe('tok-stale')

    const ok = await store.ensureCsrf()

    expect(ok).toBe(false)
    expect(store.csrf).toBeNull()
  })

  it('promptForAuth opens the modal with the given hint and resolves via resolvePrompt', async () => {
    const store = useAuthStore()

    const pending = store.promptForAuth('set-password')
    expect(store.promptOpen).toBe(true)
    expect(store.promptHint).toBe('set-password')

    store.resolvePrompt(true)

    await expect(pending).resolves.toBe(true)
    expect(store.promptOpen).toBe(false)
  })

  it('promptForAuth returns false when the user cancels', async () => {
    const store = useAuthStore()

    const pending = store.promptForAuth('login')
    store.resolvePrompt(false)

    await expect(pending).resolves.toBe(false)
  })

  it('promptForAuth shares a single in-flight prompt for concurrent callers', async () => {
    const store = useAuthStore()

    const p1 = store.promptForAuth('login')
    const p2 = store.promptForAuth('login')

    // A single resolvePrompt() call unblocks BOTH concurrent callers —
    // proof that they were sharing one prompt rather than each queuing
    // their own (which would leave p2 unresolved here).
    store.resolvePrompt(true)

    await expect(p1).resolves.toBe(true)
    await expect(p2).resolves.toBe(true)
  })

  it('a new promptForAuth after resolution opens a fresh prompt', async () => {
    const store = useAuthStore()

    const p1 = store.promptForAuth('login')
    store.resolvePrompt(true)
    await p1

    const p2 = store.promptForAuth('set-password')
    expect(p2).not.toBe(p1)
    expect(store.promptOpen).toBe(true)
    expect(store.promptHint).toBe('set-password')
  })
})
