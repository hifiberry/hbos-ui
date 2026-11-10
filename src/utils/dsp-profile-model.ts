// Which DSP profiles fit the detected sound card.
//
// Two boards carry their own DSP and have profiles of their own: the DAC+ DSP
// and the Beocreate 4-Channel Amplifier. Every other HiFiBerry card gets a DSP
// only through the DSP add-on, so on those the add-on's profiles are the ones
// that fit. Matching only "DAC2" here used to leave a Digi2 Pro (or Amp4 Pro,
// DAC2 HD, ...) with the add-on unmapped, so the page listed every profile,
// including the DAC+ DSP one. A Digi2 Pro with that profile on its add-on had
// no S/PDIF output (hifiberry/hifiberry-os#665).

export const DSP_ADDON_MODEL = 'DSP add-on'

/** The profile `modelName` that fits a detected card, or null if unknown. */
export function dspModelForCard(cardName: string | null | undefined): string | null {
  if (!cardName) return null
  const card = cardName.toLowerCase()
  if (card.includes('beocreate')) return 'Beocreate 4-Channel Amplifier'
  if (card.includes('dac+ dsp') || card.includes('dac+dsp') || card.includes('dacdsp')) {
    return 'DAC+ DSP'
  }
  return DSP_ADDON_MODEL
}

/** How the page names the hardware the profiles are listed for. */
export function dspHardwareLabel(cardName: string | null | undefined): string {
  if (!cardName) return 'Unknown'
  const model = dspModelForCard(cardName)
  if (model === 'Beocreate 4-Channel Amplifier') return 'Beocreate'
  if (model === 'DAC+ DSP') return 'DAC+DSP'
  return `${cardName} + DSP add-on`
}
