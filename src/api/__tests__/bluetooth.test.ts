import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({ getConfigApiBaseUrl: () => 'http://host/api/config/v1' }),
}))

import BluetoothDeviceEntry from '@/components/BluetoothDeviceEntry.vue'

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  headers: new Headers(headers),
  json: async () => body,
})

const challenge = () => jsonResponse(401, {}, { 'WWW-Authenticate-Hint': 'login' })

const mountEntry = () =>
  mount(BluetoothDeviceEntry, {
    props: { name: 'Phone', address: 'AA:BB:CC:DD:EE:FF', connected: true, trusted: true },
  })

const clickUnpair = async (wrapper: ReturnType<typeof mountEntry>) => {
  await wrapper.get('button.btn-disconnect').trigger('click')
  // let the fetch chain (and any auth retry) settle
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * config.json classifies `/bluetooth/*` as ok for GET only, so every Bluetooth
 * write is risky and must go through apiFetch — otherwise the UI shows a bare
 * HTTP 401 and never asks the user to sign in. The remaining Bluetooth writes
 * (settings toggle, passkey) are covered structurally by noRawFetch.test.ts.
 */
describe('bluetooth writes go through the auth gateway', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('unpair prompts for the password on a 401 and retries', async () => {
    const authStore = useAuthStore()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(challenge())
      .mockResolvedValue(jsonResponse(200, { status: 'success' }))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(authStore, 'ensureCsrf').mockResolvedValue(false)
    const promptSpy = vi.spyOn(authStore, 'promptForAuth').mockResolvedValue(true)

    await clickUnpair(mountEntry())

    expect(promptSpy).toHaveBeenCalledWith('login')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0][0])).toContain('/bluetooth/unpair')
  })

  it('unpair sends the csrf token and session cookie', async () => {
    const authStore = useAuthStore()
    authStore.csrf = 'tok-abc'
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { status: 'success' }))
    vi.stubGlobal('fetch', fetchMock)

    await clickUnpair(mountEntry())

    const [, init] = fetchMock.mock.calls[0]
    expect(init.credentials).toBe('same-origin')
    expect((init.headers as Headers).get('X-CSRF-Token')).toBe('tok-abc')
  })
})
