import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/stores/appconfig', () => ({
  useAppConfigStore: () => ({
    getDSPToolkitApiBaseUrl: () => 'http://host/api/dsptoolkit',
  }),
}))

import {
  listSpeakerPresets,
  getSpeakerPreset,
  applySpeakerPreset,
} from '@/api/dsptoolkit'

const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => body,
  text: async () => JSON.stringify(body),
})

const A_SUMMARY = {
  id: 'beovox-s35',
  name: 'Beovox S 35',
  description: null,
  requiredProfile: 'beocreate-universal',
  sampleRate: 48000,
  readOnly: true,
  filterCounts: { a: 9, b: 9, c: 6, d: 6 },
  compatible: true,
  incompatibleReason: null,
}

describe('speaker preset API', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('lists presets and the current selection', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { presets: [A_SUMMARY], current: 'beovox-s35' }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await listSpeakerPresets()

    expect(fetchMock.mock.calls[0][0]).toBe('http://host/api/dsptoolkit/presets')
    expect(result.presets).toHaveLength(1)
    expect(result.presets[0].name).toBe('Beovox S 35')
    expect(result.current).toBe('beovox-s35')
  })

  it('reads one preset in full', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        ...A_SUMMARY,
        schemaVersion: 2,
        minProfileVersion: 11,
        channels: {
          a: { role: 'mono', level: 1, delayMs: 0, invert: false, enabled: true, filters: [] },
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const preset = await getSpeakerPreset('beovox-s35')

    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://host/api/dsptoolkit/presets/beovox-s35',
    )
    expect(preset.channels.a.role).toBe('mono')
  })

  it('applies a preset with a POST', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        status: 'success',
        preset: 'beovox-s35',
        banksWritten: 4,
        filtersWritten: 64,
        registersWritten: 16,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await applySpeakerPreset('beovox-s35')

    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://host/api/dsptoolkit/presets/beovox-s35/apply',
    )
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(result.status).toBe('success')
    expect(result.banksWritten).toBe(4)
  })

  it('surfaces an incompatible preset as an error rather than a silent no-op', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(409, { incompatibleReason: 'wrong profile' }),
      ),
    )

    await expect(applySpeakerPreset('beovox-s35')).rejects.toThrow('409')
  })
})
