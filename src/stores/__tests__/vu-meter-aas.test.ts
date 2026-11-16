import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { enableService, disableService } = vi.hoisted(() => ({
  enableService: vi.fn(),
  disableService: vi.fn(),
}))
vi.mock('@/api/config', () => ({
  enableService, disableService,
  getConfigKeys: vi.fn(), getConfigValue: vi.fn(),
  setConfigValue: vi.fn().mockResolvedValue({ status: 'success' }),
  deleteConfigValue: vi.fn(),
}))
vi.mock('@/api/system', () => ({ getSystemInfo: vi.fn() }))

import { useAudioServerStore } from '@/stores/audio-server'
import { useVuMeterStore } from '@/stores/vu-meter'
import { useSettingsStore } from '@/stores/settings'

class FakeSocket {
  static urls: string[] = []
  static last: FakeSocket | null = null
  binaryType = ''
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  constructor(url: string) { FakeSocket.urls.push(url); FakeSocket.last = this }
  close() {}
}

describe('vu meter under aas', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    FakeSocket.urls = []
    enableService.mockClear()
    disableService.mockClear()
    vi.stubGlobal('WebSocket', FakeSocket)
  })

  it('connects to the PipeWire levels by default', () => {
    const vu = useVuMeterStore()
    vu.connect()
    expect(FakeSocket.urls[0]).toMatch(/^ws:\/\/[^/]+\/api\/vu-meter\/api\/v1\/levels$/)
    vu.disconnect()
  })

  it('connects to /api/aas/v1/levels under aas', () => {
    useAudioServerStore().running = 'aas'
    const vu = useVuMeterStore()
    vu.connect()
    expect(FakeSocket.urls[0]).toMatch(/^ws:\/\/[^/]+\/api\/aas\/v1\/levels$/)
    vu.disconnect()
  })

  it('reads meter 1 from an aas frame', () => {
    useAudioServerStore().running = 'aas'
    const vu = useVuMeterStore()
    vu.connect()
    const frame = new Uint8Array([16, 2, 1, 2, 3, 4, 0, 1, 2, 50, 60, 70, 80, 2]).buffer
    FakeSocket.last!.onmessage!({ data: frame } as MessageEvent)
    expect([vu.leftRms, vu.leftPeak, vu.rightRms, vu.rightPeak]).toEqual([50, 60, 70, 80])
    expect([vu.leftClipping, vu.rightClipping]).toEqual([false, true])
    vu.disconnect()
  })

  it('does not toggle the vu-meter service under aas', async () => {
    useAudioServerStore().running = 'aas'
    await useSettingsStore().updateVuMeterEnabled(true)
    await useSettingsStore().updateVuMeterEnabled(false)
    expect(enableService).not.toHaveBeenCalled()
    expect(disableService).not.toHaveBeenCalled()
  })

  it('still toggles it under PipeWire', async () => {
    await useSettingsStore().updateVuMeterEnabled(true)
    expect(enableService).toHaveBeenCalledWith('vu-meter')
  })
})
