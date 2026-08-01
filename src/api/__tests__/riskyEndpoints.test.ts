import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    getApiBaseUrl: () => 'http://host/api/audiocontrol',
    getConfigApiBaseUrl: () => 'http://host/api/config/v1',
    getRoomEQApiBaseUrl: () => 'http://host/api/roomeq',
  }),
}))

import { getAllConfig, getConfigValue } from '@/api/config'
import { getFilterChain } from '@/api/filterchain'
import { startRoomEQRecording, startRoomMeasure } from '@/api/roomeq'

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  headers: new Headers(headers),
  json: async () => body,
  text: async () => JSON.stringify(body),
})

const challenge = () => jsonResponse(401, {}, { 'WWW-Authenticate-Hint': 'login' })

describe('risky endpoints outside the spotify/lastfm flows', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  /** roomeq.json leaves /audio/record/start and /audio/room-measure on the risky
   *  default: a network client must not be able to silently record the room. */
  const roomeqCalls: Array<[string, () => Promise<{ success: boolean; detail?: string }>]> = [
    ['startRoomEQRecording', () => startRoomEQRecording({ duration: 5 })],
    ['startRoomMeasure', () => startRoomMeasure({})],
  ]

  it.each(roomeqCalls)('%s prompts for the password on a 401 and retries', async (_name, call) => {
    const authStore = useAuthStore()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(challenge())
      .mockResolvedValue(jsonResponse(200, { recording_id: 1 }))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(authStore, 'ensureCsrf').mockResolvedValue(false)
    const promptSpy = vi.spyOn(authStore, 'promptForAuth').mockResolvedValue(true)

    const result = await call()

    expect(promptSpy).toHaveBeenCalledWith('login')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.success).toBe(true)
  })

  it.each(roomeqCalls)('%s reports a cancelled prompt instead of a bare 401', async (_name, call) => {
    const authStore = useAuthStore()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(challenge()))
    vi.spyOn(authStore, 'ensureCsrf').mockResolvedValue(false)
    vi.spyOn(authStore, 'promptForAuth').mockResolvedValue(false)

    const result = await call()

    expect(result.success).toBe(false)
    expect(result.detail).toMatch(/Authentication required/)
  })

  it.each(roomeqCalls)('%s sends the csrf token and session cookie', async (_name, call) => {
    const authStore = useAuthStore()
    authStore.csrf = 'tok-abc'
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}))
    vi.stubGlobal('fetch', fetchMock)

    await call()

    const [, init] = fetchMock.mock.calls[0]
    expect(init.credentials).toBe('same-origin')
    expect((init.headers as Headers).get('X-CSRF-Token')).toBe('tok-abc')
  })

  /** /api/config/v1/pipewire/filtergraph is not in config.json's ok list. */
  it('getFilterChain prompts for the password on a 401 and retries', async () => {
    const authStore = useAuthStore()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(challenge())
      .mockResolvedValue(jsonResponse(200, 'digraph {}', { 'content-type': 'text/plain' }))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(authStore, 'ensureCsrf').mockResolvedValue(false)
    const promptSpy = vi.spyOn(authStore, 'promptForAuth').mockResolvedValue(true)

    const result = await getFilterChain()

    expect(promptSpy).toHaveBeenCalledWith('login')
    expect(result.status).toBe('success')
  })

  /** Decrypted reads go to /key/<key>/secure, which falls through config.json's
   *  ok list (`/key/*` is one segment) and is therefore risky. */
  it('getConfigValue(secure) prompts for the password on a 401 and retries', async () => {
    const authStore = useAuthStore()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(challenge())
      .mockResolvedValue(jsonResponse(200, { status: 'success', data: { value: 'v' } }))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(authStore, 'ensureCsrf').mockResolvedValue(false)
    const promptSpy = vi.spyOn(authStore, 'promptForAuth').mockResolvedValue(true)

    await getConfigValue('spotify_secret', true)

    expect(promptSpy).toHaveBeenCalledWith('login')
    expect(fetchMock.mock.calls[0][0]).toBe('http://host/api/config/v1/key/spotify_secret/secure')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  /** The bare collection read (`GET /api/config/v1`) is not in the ok list either. */
  it('getAllConfig prompts for the password on a 401 and retries', async () => {
    const authStore = useAuthStore()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(challenge())
      .mockResolvedValue(jsonResponse(200, { status: 'success', data: {} }))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(authStore, 'ensureCsrf').mockResolvedValue(false)
    const promptSpy = vi.spyOn(authStore, 'promptForAuth').mockResolvedValue(true)

    await getAllConfig()

    expect(promptSpy).toHaveBeenCalledWith('login')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
