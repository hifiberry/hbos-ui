import { describe, expect, it } from 'vitest'

import { DSP_ADDON_MODEL, dspHardwareLabel, dspModelForCard, profileMatchesProgram } from '../dsp-profile-model'

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

describe('profileMatchesProgram', () => {
  // GET /checksum on a DSP add-on running dsp-addon-96-15 (measured on hardware)
  const liveV15 = {
    checksum: '9B69E0744278376366216ED706820B04',
    format: 'checksums',
    length: { md5: '523F15F296F3BC1C20488D80F1B84822', sha1: '1F2F48D3D23E73E614AF2C40E3DCE0742ACAEBE9' },
    signature: { md5: '9B69E0744278376366216ED706820B04', sha1: '68F21BEFF590B656046AB330BA8DB286B6CD2F4D' },
  }
  const v15 = { checksum: 'F195C42FB8BFD877F7342E79CEF77753', checksum_sha1: '1F2F48D3D23E73E614AF2C40E3DCE0742ACAEBE9' }
  const v14 = { checksum: '8799D19C863321CBF62CD665C92F9120', checksum_sha1: 'F373DA37E204E6A3105D67E8F49A0A6D35AAF629' }

  it('matches the installed profile by SHA-1 although its MD5 matches nothing', () => {
    expect(profileMatchesProgram(v15, liveV15)).toBe(true)
  })

  it('does not match another profile', () => {
    expect(profileMatchesProgram(v14, liveV15)).toBe(false)
  })

  it('does not fall back to MD5 when the profile has a SHA-1', () => {
    expect(profileMatchesProgram({ checksum: liveV15.checksum, checksum_sha1: v14.checksum_sha1 }, liveV15)).toBe(false)
  })

  it('matches an older MD5-only profile against the signature MD5', () => {
    // dacdsp-15 as seen in hifiberry-os#665: profile MD5 == live signature MD5
    const live = { checksum: '46425944F76975439E0FD9760106FF83', format: 'checksums' }
    expect(profileMatchesProgram({ checksum: '46425944f76975439e0fd9760106ff83' }, live)).toBe(true)
  })

  it('is false without data', () => {
    expect(profileMatchesProgram(null, liveV15)).toBe(false)
    expect(profileMatchesProgram(v15, null)).toBe(false)
    expect(profileMatchesProgram({}, liveV15)).toBe(false)
  })
})
