import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  getSystemInfo: vi.fn(),
  getSystemdServiceStatus: vi.fn(),
  getRIAAEnabled: vi.fn(),
  getSpeakerEQMasterGain: vi.fn(),
}))
vi.mock('@/api/system', () => ({ getSystemInfo: m.getSystemInfo }))
vi.mock('@/api/config', () => ({ getSystemdServiceStatus: m.getSystemdServiceStatus }))
vi.mock('@/api/pipewire', () => ({
  getRIAAEnabled: m.getRIAAEnabled,
  getSpeakerEQMasterGain: m.getSpeakerEQMasterGain,
}))

import { collectAasWarnings } from '@/composables/useAasWarnings'

const idle = () => {
  m.getSystemInfo.mockResolvedValue({ bluetooth: { devices: [] } })
  m.getSystemdServiceStatus.mockResolvedValue({ data: { enabled: 'disabled' } })
  m.getRIAAEnabled.mockResolvedValue({ enabled: false })
  m.getSpeakerEQMasterGain.mockResolvedValue({ gain: 0 })
}

describe('collectAasWarnings', () => {
  beforeEach(() => {
    Object.values(m).forEach((f) => f.mockReset())
    idle()
  })

  it('is empty when nothing is in use', async () => {
    expect(await collectAasWarnings()).toEqual([])
  })

  it('lists a paired Bluetooth device', async () => {
    m.getSystemInfo.mockResolvedValue({ bluetooth: { devices: [{ name: 'x' }] } })
    const w = await collectAasWarnings()
    expect(w).toHaveLength(1)
    expect(w[0]).toMatch(/Bluetooth/)
  })

  it('lists enabled services by name', async () => {
    m.getSystemdServiceStatus.mockImplementation(async (name: string) => ({
      data: { enabled: name === 'aes67' || name === 'soloist' ? 'enabled' : 'disabled' },
    }))
    const w = await collectAasWarnings()
    expect(w).toHaveLength(2)
    expect(w.join()).toMatch(/AES67/)
    expect(w.join()).toMatch(/Soloist/)
  })

  it('lists the input processor and a volume limit below 0 dB', async () => {
    m.getRIAAEnabled.mockResolvedValue({ enabled: true })
    m.getSpeakerEQMasterGain.mockResolvedValue({ gain: -6 })
    const w = await collectAasWarnings()
    expect(w).toHaveLength(2)
    expect(w[0]).toMatch(/input processor/)
    expect(w[1]).toMatch(/volume limit/)
  })

  it('leaves out a check that fails', async () => {
    m.getSystemInfo.mockRejectedValue(new Error('down'))
    m.getSystemdServiceStatus.mockRejectedValue(new Error('down'))
    m.getRIAAEnabled.mockResolvedValue({ error: true, message: 'x' })
    m.getSpeakerEQMasterGain.mockRejectedValue(new Error('down'))
    expect(await collectAasWarnings()).toEqual([])
  })
})
