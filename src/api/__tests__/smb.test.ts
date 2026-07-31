import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({ getConfigApiBaseUrl: () => 'http://host/api/config/v1' }),
}))

import {
  getSmbMounts,
  getSmbServers,
  getSmbShares,
  mountAllSmbShares,
  mountSmbShare,
  mountSmbShareWithRetry,
  testSmbServer,
  unmountSmbShare,
} from '@/api/smb'

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  headers: new Headers(headers),
  json: async () => body,
})

const success = { status: 'success', data: {}, message: '' }

/** Every risky SMB write: name → invocation. All of these hit endpoints the
 *  auth gateway classifies as risky, so each must go through apiFetch. */
const riskyCalls: Array<[string, () => Promise<unknown>]> = [
  ['testSmbServer', () => testSmbServer('192.168.1.27')],
  ['getSmbShares', () => getSmbShares('192.168.1.27')],
  ['mountSmbShare', () => mountSmbShare({ server: '192.168.1.27', share: 'music' })],
  ['mountAllSmbShares', () => mountAllSmbShares()],
  ['unmountSmbShare', () => unmountSmbShare('192.168.1.27', 'music')],
  [
    'mountSmbShareWithRetry',
    () => mountSmbShareWithRetry({ server: '192.168.1.27', share: 'music' }),
  ],
]

describe('smb api auth handling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it.each(riskyCalls)('%s prompts for the password on a 401 and retries', async (_name, call) => {
    const authStore = useAuthStore()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, {}, { 'WWW-Authenticate-Hint': 'set-password' }))
      .mockResolvedValue(jsonResponse(200, success))
    vi.stubGlobal('fetch', fetchMock)

    const promptSpy = vi.spyOn(authStore, 'promptForAuth').mockImplementation(async (hint) => {
      expect(hint).toBe('set-password')
      authStore.csrf = 'tok-1'
      return true
    })

    await call()

    expect(promptSpy).toHaveBeenCalledTimes(1)
    // The retry carries the token minted by the prompt.
    expect(fetchMock.mock.calls[1][1].headers.get('X-CSRF-Token')).toBe('tok-1')
  })

  it.each(riskyCalls)('%s attaches the csrf token and session cookie', async (_name, call) => {
    const authStore = useAuthStore()
    authStore.csrf = 'tok-abc'
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, success))
    vi.stubGlobal('fetch', fetchMock)

    await call()

    const init = fetchMock.mock.calls[0][1]
    expect(init.credentials).toBe('same-origin')
    expect((init.headers as Headers).get('X-CSRF-Token')).toBe('tok-abc')
  })

  it.each(riskyCalls)('%s surfaces a cancelled prompt as an error', async (_name, call) => {
    const authStore = useAuthStore()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, {}, { 'WWW-Authenticate-Hint': 'set-password' })),
    )
    vi.spyOn(authStore, 'promptForAuth').mockResolvedValue(false)

    await expect(call()).rejects.toThrow(/Authentication required/)
  })

  it('keeps the JSON content type on the request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, success))
    vi.stubGlobal('fetch', fetchMock)

    await testSmbServer('192.168.1.27', 'user', 'secret')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://host/api/config/v1/smb/test/192.168.1.27')
    expect((init.headers as Headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({
      server: '192.168.1.27',
      username: 'user',
      password: 'secret',
    })
  })

  it('routes the ok-tier reads through apiFetch too (session cookie, no csrf)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, success))
    vi.stubGlobal('fetch', fetchMock)

    await getSmbMounts()
    await getSmbServers()

    for (const [, init] of fetchMock.mock.calls) {
      expect(init.credentials).toBe('same-origin')
      expect((init.headers as Headers).has('X-CSRF-Token')).toBe(false)
    }
  })
})
