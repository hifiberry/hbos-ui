import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({ getApiBaseUrl: () => 'http://host/api/audiocontrol' }),
}))

import {
  completeLastFMAuth,
  disconnectLastFM,
  getLastFMStatus,
  prepareLastFMAuthCompletion,
  startLastFMAuth,
} from '@/api/lastfm'

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  headers: new Headers(headers),
  json: async () => body,
})

const success = { authenticated: true, success: true, url: 'https://last.fm/auth' }

/** audiocontrol-auth.json marks only /lastfm/status as ok; the whole auth flow
 *  is risky and must go through apiFetch. */
const riskyCalls: Array<[string, () => Promise<unknown>]> = [
  ['startLastFMAuth', () => startLastFMAuth()],
  ['prepareLastFMAuthCompletion', () => prepareLastFMAuthCompletion('token-1')],
  ['completeLastFMAuth', () => completeLastFMAuth()],
  ['disconnectLastFM', () => disconnectLastFM()],
]

describe('lastfm api auth handling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it.each(riskyCalls)('%s prompts for the password on a 401 and retries', async (_name, call) => {
    const authStore = useAuthStore()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, {}, { 'WWW-Authenticate-Hint': 'login' }))
      .mockResolvedValue(jsonResponse(200, success))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(authStore, 'ensureCsrf').mockResolvedValue(false)

    const promptSpy = vi.spyOn(authStore, 'promptForAuth').mockImplementation(async (hint) => {
      expect(hint).toBe('login')
      authStore.csrf = 'tok-1'
      return true
    })

    await call()

    expect(promptSpy).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it.each(riskyCalls)('%s attaches the session cookie', async (_name, call) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, success))
    vi.stubGlobal('fetch', fetchMock)

    await call()

    expect(fetchMock.mock.calls[0][1].credentials).toBe('same-origin')
  })

  it.each(riskyCalls)('%s surfaces a cancelled prompt as an error', async (_name, call) => {
    const authStore = useAuthStore()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, {}, { 'WWW-Authenticate-Hint': 'login' })),
    )
    vi.spyOn(authStore, 'ensureCsrf').mockResolvedValue(false)
    vi.spyOn(authStore, 'promptForAuth').mockResolvedValue(false)

    await expect(call()).rejects.toThrow(/Authentication required/)
  })

  it('sends the csrf token on the risky writes', async () => {
    const authStore = useAuthStore()
    authStore.csrf = 'tok-abc'
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, success))
    vi.stubGlobal('fetch', fetchMock)

    await prepareLastFMAuthCompletion('token-1')
    await disconnectLastFM()

    for (const [, init] of fetchMock.mock.calls) {
      expect((init.headers as Headers).get('X-CSRF-Token')).toBe('tok-abc')
    }
  })

  it('keeps the JSON content type and body when preparing auth completion', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, success))
    vi.stubGlobal('fetch', fetchMock)

    await prepareLastFMAuthCompletion('token-1')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://host/api/audiocontrol/lastfm/prepare_complete_auth')
    expect(init.method).toBe('POST')
    expect((init.headers as Headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ token: 'token-1' })
  })

  it('routes the ok-tier status read through apiFetch too (session cookie, no csrf)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, success))
    vi.stubGlobal('fetch', fetchMock)

    await getLastFMStatus()

    const [, init] = fetchMock.mock.calls[0]
    expect(init.credentials).toBe('same-origin')
    expect((init.headers as Headers).has('X-CSRF-Token')).toBe(false)
  })
})
