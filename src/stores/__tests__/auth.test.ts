import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { getAuthStatus, login, logout, setPassword, setPolicy } = vi.hoisted(() => ({
  getAuthStatus: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  setPassword: vi.fn(),
  setPolicy: vi.fn(),
}))

vi.mock('@/api/auth', () => ({
  getAuthStatus,
  login,
  logout,
  setPassword,
  setPolicy,
}))

import { useAuthStore } from '@/stores/auth'

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    getAuthStatus.mockReset()
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
