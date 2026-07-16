import { describe, it, expect, vi, beforeEach } from 'vitest'

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
    vi.restoreAllMocks()
  })

  it('lists github sources', async () => {
    const fetchMock = ok({ status: 'success', data: { sources: [{ id: 'a-b', repo: 'a/b' }] } })
    vi.stubGlobal('fetch', fetchMock)

    const result = await listGithubSources()

    expect(fetchMock).toHaveBeenCalledWith('http://host/api/v1/extensions/github-sources')
    expect(result.data.sources[0].repo).toBe('a/b')
  })

  it('adds a github source posting {repo}', async () => {
    const fetchMock = ok({ status: 'success', data: { source: { id: 'p-x', repo: 'pulpier/x' } } })
    vi.stubGlobal('fetch', fetchMock)

    await addGithubSource('pulpier/x')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://host/api/v1/extensions/github-sources',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: 'pulpier/x' }),
      }),
    )
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
