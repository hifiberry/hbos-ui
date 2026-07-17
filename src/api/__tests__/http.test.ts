import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { apiFetch } from '@/api/http'

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Headers(headers),
  json: async () => body,
})

// Let pending promise callbacks (fetch resolution, store prompt setup) run.
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe('apiFetch', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('prompts and retries once after a 401, succeeding with the refreshed csrf', async () => {
    const authStore = useAuthStore()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, {}, { 'WWW-Authenticate-Hint': 'login' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    const promptSpy = vi.spyOn(authStore, 'promptForAuth').mockImplementation(async (hint) => {
      expect(hint).toBe('login')
      authStore.csrf = 'tok-2'
      return true
    })

    const response = await apiFetch('/api/config/v1/systemd/service/mpd/restart', {
      method: 'POST',
    })

    expect(response.status).toBe(200)
    expect(promptSpy).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1].headers.get('X-CSRF-Token')).toBe('tok-2')
  })

  it('throws when the prompt is cancelled', async () => {
    const authStore = useAuthStore()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, {}, { 'WWW-Authenticate-Hint': 'set-password' }))
    vi.stubGlobal('fetch', fetchMock)

    vi.spyOn(authStore, 'promptForAuth').mockResolvedValue(false)

    await expect(apiFetch('/api/config/v1/network', { method: 'POST' })).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never prompts on a 200', async () => {
    const authStore = useAuthStore()
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    const promptSpy = vi.spyOn(authStore, 'promptForAuth')

    const response = await apiFetch('/api/audiocontrol/library')

    expect(response.status).toBe(200)
    expect(promptSpy).not.toHaveBeenCalled()
  })

  it('shares a single prompt across concurrent 401s', async () => {
    const authStore = useAuthStore()
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(401, {}, { 'WWW-Authenticate-Hint': 'login' }))
    vi.stubGlobal('fetch', fetchMock)

    const p1 = apiFetch('/api/config/v1/a', { method: 'POST' })
    const p2 = apiFetch('/api/config/v1/b', { method: 'POST' })

    await flush()
    expect(authStore.promptOpen).toBe(true)
    const callsBeforeResolve = fetchMock.mock.calls.length

    // ONE resolution unblocks BOTH pending callers.
    authStore.resolvePrompt(true)

    const [r1, r2] = await Promise.all([p1, p2])

    // Each retried request is a real extra fetch call, but only one prompt
    // was ever opened/resolved for both.
    expect(fetchMock.mock.calls.length).toBe(callsBeforeResolve + 2)
    expect(r1.status).toBe(401)
    expect(r2.status).toBe(401)
  })

  it('attaches X-CSRF-Token on POST but not on GET', async () => {
    const authStore = useAuthStore()
    authStore.csrf = 'tok-abc'
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}))
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/api/config/v1/systeminfo', { method: 'GET' })
    await apiFetch('/api/config/v1/systemd/service/mpd/restart', { method: 'POST' })

    const getHeaders: Headers = fetchMock.mock.calls[0][1].headers
    const postHeaders: Headers = fetchMock.mock.calls[1][1].headers
    expect(getHeaders.has('X-CSRF-Token')).toBe(false)
    expect(postHeaders.get('X-CSRF-Token')).toBe('tok-abc')
  })

  it('sends credentials: same-origin', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}))
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/api/config/v1/systeminfo')

    expect(fetchMock.mock.calls[0][1].credentials).toBe('same-origin')
  })
})
