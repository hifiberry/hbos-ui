import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const getOutput = vi.fn()
const setOutputLimit = vi.fn()
const getSpeakerEQMasterGain = vi.fn()
const setSpeakerEQMasterGain = vi.fn()

vi.mock('@/api/aas', () => ({
  getOutput: (...a: unknown[]) => getOutput(...a),
  setOutputLimit: (...a: unknown[]) => setOutputLimit(...a),
  getPlugins: async () => [],
  setPluginParams: vi.fn(),
  getMatrix: async () => ({ outputs: [] }),
  putMatrix: vi.fn(),
  isAasError: (r: unknown) => typeof r === 'object' && r !== null && 'error' in r,
}))
vi.mock('@/api/pipewire', () => ({
  getSpeakerEQMasterGain: (...a: unknown[]) => getSpeakerEQMasterGain(...a),
  setSpeakerEQMasterGain: (...a: unknown[]) => setSpeakerEQMasterGain(...a),
  getSpeakerEQCrossbar: async () => ({ error: 'x', message: 'x' }),
  setSpeakerEQCrossbarMatrix: vi.fn(),
}))
vi.mock('@/api/system', () => ({ getSystemInfo: async () => ({ status: 'error' }) }))
vi.mock('@/api/volume', () => ({
  getHeadphoneControls: async () => ({ status: 'error' }),
  getHeadphoneVolume: vi.fn(),
  setHeadphoneVolume: vi.fn(),
}))

import GeneralSound from '@/views/sound/general-sound.vue'
import ProgressSlider from '@/components/ProgressSlider.vue'
import { useAudioServerStore } from '@/stores/audio-server'

const stubs = { PageContent: { template: '<div><slot /></div>' }, Icon: true }

const mountUnder = async (server: 'aas' | 'pipewire') => {
  setActivePinia(createPinia())
  useAudioServerStore().running = server
  const wrapper = mount(GeneralSound, { global: { stubs } })
  await flushPromises()
  return wrapper
}

// The first slider on the page is the volume limit.
const limitSlider = (w: Awaited<ReturnType<typeof mountUnder>>) => w.findAllComponents(ProgressSlider)[0]

describe('the volume limit on the general sound page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('under aas shows the master limit as a percentage of -60 to 0 dB', async () => {
    getOutput.mockResolvedValue({ id: 1, volume: 40, limit_db: -12 })
    const w = await mountUnder('aas')
    expect(getOutput).toHaveBeenCalledWith(1)
    expect(w.text()).toContain('Volume limit')
    expect(limitSlider(w).props('value')).toBe(80)
    expect(limitSlider(w).props('disabled')).toBe(false)
    expect(w.text()).toContain('-12.0 dB')
    expect(getSpeakerEQMasterGain).not.toHaveBeenCalled()
  })

  it('under aas sets the limit on the master, not in PipeWire', async () => {
    getOutput.mockResolvedValue({ id: 1, limit_db: 0 })
    setOutputLimit.mockResolvedValue({ id: 1, limit_db: -30 })
    const w = await mountUnder('aas')
    limitSlider(w).vm.$emit('click:progress', 50)
    await flushPromises()
    expect(setOutputLimit).toHaveBeenCalledWith(-30)
    expect(setSpeakerEQMasterGain).not.toHaveBeenCalled()
    expect(limitSlider(w).props('value')).toBe(50)
  })

  it('under aas says what a limit costs while one is set', async () => {
    getOutput.mockResolvedValue({ id: 1, limit_db: -6 })
    const w = await mountUnder('aas')
    expect(w.text()).toMatch(/DSD/)
  })

  it('under an aas without the limit disables the control and says why', async () => {
    getOutput.mockResolvedValue({ id: 1, volume: 40 })
    const w = await mountUnder('aas')
    expect(limitSlider(w).props('disabled')).toBe(true)
    expect(w.text()).toMatch(/update aas/i)
  })

  it('under aas, when aas cannot be reached, disables the control', async () => {
    getOutput.mockResolvedValue({ error: 'Network Error', message: 'down' })
    const w = await mountUnder('aas')
    expect(limitSlider(w).props('disabled')).toBe(true)
    expect(w.text()).toContain('cannot be reached')
  })

  it('under aas keeps the control disabled until the limit has loaded', async () => {
    getOutput.mockReturnValue(new Promise(() => {}))
    const w = await mountUnder('aas')
    expect(limitSlider(w).props('disabled')).toBe(true)
  })

  it('under aas a refused change disables the control and says so', async () => {
    getOutput.mockResolvedValue({ id: 1, limit_db: 0 })
    setOutputLimit.mockResolvedValue({ error: 'HTTP 422', message: 'no' })
    const w = await mountUnder('aas')
    limitSlider(w).vm.$emit('click:progress', 50)
    await flushPromises()
    expect(limitSlider(w).props('disabled')).toBe(true)
    expect(w.text()).toMatch(/could not be changed/)
  })

  it('under PipeWire still uses the speaker EQ master gain', async () => {
    getSpeakerEQMasterGain.mockResolvedValue({ gain: -6 })
    setSpeakerEQMasterGain.mockResolvedValue({ gain: -30 })
    const w = await mountUnder('pipewire')
    expect(limitSlider(w).props('value')).toBe(90)
    limitSlider(w).vm.$emit('click:progress', 50)
    await flushPromises()
    expect(setSpeakerEQMasterGain).toHaveBeenCalledWith(-30)
    expect(getOutput).not.toHaveBeenCalled()
    expect(setOutputLimit).not.toHaveBeenCalled()
  })
})
