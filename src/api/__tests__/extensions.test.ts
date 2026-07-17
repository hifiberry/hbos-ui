import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({ getConfigApiBaseUrl: () => 'http://host/api/v1' }),
}))

import {
  addExtensionSource,
  getExtensionJob,
  installExtension,
  listExtensions,
  refreshExtensions,
  removeExtensionSource,
  uninstallExtension,
} from '@/api/extensions'

const ok = (data: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => data })

describe('extensions api', () => {
  beforeEach(() => {
    // These calls are routed through apiFetch (@/api/http), which reads
    // the auth store's cached csrf token — it needs an active Pinia.
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('lists extensions', async () => {
    const fetchMock = ok({ status: 'success', data: { extensions: [{ package: 'a' }] } })
    vi.stubGlobal('fetch', fetchMock)

    const result = await listExtensions()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('http://host/api/v1/extensions')
    expect(result.data.extensions[0].package).toBe('a')
  })

  it('POSTs to install', async () => {
    const fetchMock = ok({ status: 'success', data: { job: { id: 'j1' } } })
    vi.stubGlobal('fetch', fetchMock)

    const result = await installExtension('hifiberry-tidal-connect')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://host/api/v1/extensions/hifiberry-tidal-connect/install',
      expect.objectContaining({ method: 'POST', credentials: 'same-origin' }),
    )
    expect(result.data.job.id).toBe('j1')
  })

  it('POSTs to uninstall', async () => {
    const fetchMock = ok({ status: 'success', data: { job: { id: 'j2' } } })
    vi.stubGlobal('fetch', fetchMock)

    await uninstallExtension('hifiberry-tidal-connect')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://host/api/v1/extensions/hifiberry-tidal-connect/uninstall',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('POSTs to refresh', async () => {
    const fetchMock = ok({ status: 'success', data: { job: { id: 'j3' } } })
    vi.stubGlobal('fetch', fetchMock)

    await refreshExtensions()

    expect(fetchMock).toHaveBeenCalledWith(
      'http://host/api/v1/extensions/refresh',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('gets a job', async () => {
    const fetchMock = ok({
      status: 'success',
      data: { job: { id: 'j1', phase: 'installing' }, reboot_required: false },
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await getExtensionJob('j1')

    expect(fetchMock.mock.calls[0][0]).toBe('http://host/api/v1/extensions/jobs/j1')
    expect(result.data.job.phase).toBe('installing')
  })

  it('encodes the job id', async () => {
    const fetchMock = ok({ status: 'success', data: {} })
    vi.stubGlobal('fetch', fetchMock)

    await getExtensionJob('a b/c')

    expect(fetchMock.mock.calls[0][0]).toBe('http://host/api/v1/extensions/jobs/a%20b%2Fc')
  })

  it('adds a source', async () => {
    const fetchMock = ok({ status: 'success', data: { source: { id: 'acme' } } })
    vi.stubGlobal('fetch', fetchMock)

    await addExtensionSource({
      id: 'acme',
      uri: 'https://repo.acme.com',
      suite: 'trixie',
      components: 'main',
      key: 'KEY',
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://host/api/v1/extensions/sources')
    expect(init.method).toBe('POST')
    expect((init.headers as Headers).get('Content-Type')).toBe('application/json')
    expect(init.body).toBe(
      JSON.stringify({
        id: 'acme',
        uri: 'https://repo.acme.com',
        suite: 'trixie',
        components: 'main',
        key: 'KEY',
      }),
    )
  })

  it('removes a source', async () => {
    const fetchMock = ok({ status: 'success' })
    vi.stubGlobal('fetch', fetchMock)

    await removeExtensionSource('acme')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://host/api/v1/extensions/sources/acme',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('throws on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    )
    await expect(listExtensions()).rejects.toThrow()
  })

  it('surfaces the server error message when present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ status: 'error', message: 'not a HiFiBerry extension' }),
      }),
    )
    await expect(installExtension('openssh-server')).rejects.toThrow(
      /not a HiFiBerry extension/,
    )
  })
})
