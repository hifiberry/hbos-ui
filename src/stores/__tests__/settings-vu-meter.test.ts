import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from '@/stores/settings'
import { useAudioServerStore } from '@/stores/audio-server'

describe('settings store: VU meter support', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('is off for an older Pi under PipeWire', () => {
    const s = useSettingsStore()
    expect(s.isPi5OrHigher).toBe(false)
    expect(s.isVuMeterSupported).toBe(false)
  })

  it('is on under aas whatever the Pi', () => {
    useAudioServerStore().running = 'aas'
    expect(useSettingsStore().isVuMeterSupported).toBe(true)
  })
})
