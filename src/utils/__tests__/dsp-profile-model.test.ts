import { describe, expect, it } from 'vitest'

import { DSP_ADDON_MODEL, dspHardwareLabel, dspModelForCard } from '../dsp-profile-model'

describe('dspModelForCard', () => {
  it('maps the boards with their own DSP to their own profiles', () => {
    expect(dspModelForCard('DAC+ DSP')).toBe('DAC+ DSP')
    expect(dspModelForCard('Beocreate 4-Channel Amplifier')).toBe('Beocreate 4-Channel Amplifier')
  })

  it('maps every other card to the DSP add-on profiles', () => {
    // hifiberry-os#665: a Digi2 Pro with the add-on was offered DAC+ DSP profiles.
    for (const card of ['Digi2 Pro', 'DAC2 Pro', 'DAC2 HD', 'Amp4 Pro', 'DAC2 ADC Pro']) {
      expect(dspModelForCard(card)).toBe(DSP_ADDON_MODEL)
    }
  })

  it('leaves an unknown card unmapped', () => {
    expect(dspModelForCard(null)).toBeNull()
    expect(dspModelForCard('')).toBeNull()
  })
})

describe('dspHardwareLabel', () => {
  it('names add-on hosts as the card plus the add-on', () => {
    expect(dspHardwareLabel('Digi2 Pro')).toBe('Digi2 Pro + DSP add-on')
    expect(dspHardwareLabel('DAC2 Pro')).toBe('DAC2 Pro + DSP add-on')
  })

  it('keeps the short names for the boards with their own DSP', () => {
    expect(dspHardwareLabel('DAC+ DSP')).toBe('DAC+DSP')
    expect(dspHardwareLabel('Beocreate 4-Channel Amplifier')).toBe('Beocreate')
    expect(dspHardwareLabel(null)).toBe('Unknown')
  })
})
