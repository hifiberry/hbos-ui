import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({ getConfigApiBaseUrl: () => 'http://host/api/v1' }),
}))

import {
  addGithubSource,
  listGithubSources,
  removeGithubSource,
} from '@/api/extensions'

const ok = (data: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => data })

describe('github sources api', () => {
  beforeEach(() => {
    // Routed through apiFetch (@/api/http), which needs an active Pinia
    // to read the auth store's cached csrf token.
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('lists github sources', async () => {
    const fetchMock = ok({ status: 'success', data: { sources: [{ id: 'a-b', repo: 'a/b' }] } })
    vi.stubGlobal('fetch', fetchMock)

    const result = await listGithubSources()

    expect(fetchMock.mock.calls[0][0]).toBe('http://host/api/v1/extensions/github-sources')
    expect(result.data.sources[0].repo).toBe('a/b')
  })

  it('adds a github source posting {repo}', async () => {
    const fetchMock = ok({ status: 'success', data: { source: { id: 'p-x', repo: 'pulpier/x' } } })
    vi.stubGlobal('fetch', fetchMock)

    await addGithubSource('pulpier/x')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://host/api/v1/extensions/github-sources')
    expect(init.method).toBe('POST')
    expect((init.headers as Headers).get('Content-Type')).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ repo: 'pulpier/x' }))
  })

  it('removes a github source (encoded id, DELETE)', async () => {
    const fetchMock = ok({ status: 'success' })
    vi.stubGlobal('fetch', fetchMock)

    await removeGithubSource('pulpier-x')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://host/api/v1/extensions/github-sources/pulpier-x',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }))
    await expect(listGithubSources()).rejects.toThrow()
  })
})
