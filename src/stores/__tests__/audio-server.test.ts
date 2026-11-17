import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { getAudioServer, setAudioServer } = vi.hoisted(() => ({
  getAudioServer: vi.fn(),
  setAudioServer: vi.fn(),
}))
vi.mock('@/api/audio-server', () => ({ getAudioServer, setAudioServer }))

import { useAudioServerStore } from '@/stores/audio-server'

describe('audio-server store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getAudioServer.mockReset()
    setAudioServer.mockReset()
  })

  it('defaults to PipeWire, unavailable, not loaded', () => {
    const s = useAudioServerStore()
    expect([s.running, s.chosen, s.available, s.loaded, s.isAas]).toEqual([
      'pipewire', 'pipewire', false, false, false,
    ])
  })

  it('load() takes the reported state', async () => {
    getAudioServer.mockResolvedValue({ running: 'aas', chosen: 'pipewire', available: true })
    const s = useAudioServerStore()
    await s.load()
    expect([s.running, s.chosen, s.available, s.loaded, s.isAas]).toEqual([
      'aas', 'pipewire', true, true, true,
    ])
  })

  it('a failed load keeps the defaults', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    getAudioServer.mockResolvedValue({ error: 'Network Error', message: 'down' })
    const s = useAudioServerStore()
    await s.load()
    expect([s.running, s.chosen, s.available, s.isAas]).toEqual(['pipewire', 'pipewire', false, false])
    expect(s.loaded).toBe(true)
    expect(s.error).toBe('down')
  })

  it('a later successful load clears the error', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    getAudioServer.mockResolvedValueOnce({ error: 'Network Error', message: 'down' })
    getAudioServer.mockResolvedValueOnce({ running: 'aas', chosen: 'aas', available: true })
    const s = useAudioServerStore()
    await s.load()
    await s.load()
    expect(s.error).toBeNull()
    expect(s.isAas).toBe(true)
  })

  it('a successful load with available false has no error', async () => {
    getAudioServer.mockResolvedValue({ running: 'pipewire', chosen: 'pipewire', available: false })
    const s = useAudioServerStore()
    await s.load()
    expect([s.error, s.available]).toEqual([null, false])
  })

  it('choose() updates chosen and returns reboot_required', async () => {
    setAudioServer.mockResolvedValue({
      running: 'pipewire', chosen: 'aas', available: true, reboot_required: true,
      warnings: ['Soloist stops working'],
    })
    const s = useAudioServerStore()
    expect(await s.choose('aas')).toEqual({
      rebootRequired: true,
      warnings: ['Soloist stops working'],
    })
    expect(setAudioServer).toHaveBeenCalledWith('aas')
    expect(s.chosen).toBe('aas')
    expect(s.running).toBe('pipewire')
  })

  it('choose() defaults the warnings to none', async () => {
    setAudioServer.mockResolvedValue({
      running: 'pipewire', chosen: 'aas', available: true, reboot_required: false,
    })
    const s = useAudioServerStore()
    expect(await s.choose('aas')).toEqual({ rebootRequired: false, warnings: [] })
  })

  it('choose() rejects with the route message and leaves state', async () => {
    setAudioServer.mockResolvedValue({ error: 'HTTP 409', message: 'not installed' })
    const s = useAudioServerStore()
    await expect(s.choose('aas')).rejects.toThrow('not installed')
    expect(s.chosen).toBe('pipewire')
  })
})
