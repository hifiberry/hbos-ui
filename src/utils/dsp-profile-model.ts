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

// Whether a profile is the program running on the DSP.
//
// Profiles carry an MD5 (`checksum`) and, newer ones, a SHA-1
// (`checksum_sha1`). The SHA-1 is the reliable one: it is what the server
// computes over the program length (`length.sha1` in GET /checksum), and on
// the DSP add-on v15 profile it is the only checksum that matches -- its MD5
// matches neither live MD5. Older profiles carry only the MD5, which matches
// the signature-mode MD5 (`checksum`, a.k.a. `signature.md5`).

interface ProfileChecksums {
  checksum?: unknown
  checksum_sha1?: unknown
}

interface LiveChecksums {
  checksum?: string
  length?: { md5?: string; sha1?: string }
  signature?: { md5?: string; sha1?: string }
}

const norm = (v: unknown): string => (typeof v === 'string' ? v.trim().toUpperCase() : '')

export function profileMatchesProgram(
  profile: ProfileChecksums | null | undefined,
  live: LiveChecksums | null | undefined,
): boolean {
  if (!profile || !live) return false
  const sha1 = norm(profile.checksum_sha1)
  if (sha1) {
    return sha1 === norm(live.length?.sha1) || sha1 === norm(live.signature?.sha1)
  }
  const md5 = norm(profile.checksum)
  if (!md5) return false
  return [live.checksum, live.signature?.md5, live.length?.md5].some((v) => norm(v) === md5)
}
