/**
 * DSP Filter Bank Name Translations
 * Maps internal filter bank names to user-friendly display names
 */

export interface FilterBankTranslation {
  displayName: string
  description?: string
}

// Translation mapping for filter bank names
export const filterBankTranslations: Record<string, FilterBankTranslation> = {
  // Channel names
  'left': {
    displayName: 'Left',
    description: 'Left channel filters'
  },
  'right': {
    displayName: 'Right',
    description: 'Right channel filters'
  },
  'both': {
    displayName: 'Both',
    description: 'Stereo linked filters'
  },
  
  // IIR Crossover filters (A-Z)
  'iir_a': {
    displayName: 'Xover A',
    description: 'IIR Crossover Filter A'
  },
  'iir_b': {
    displayName: 'Xover B',
    description: 'IIR Crossover Filter B'
  },
  'iir_c': {
    displayName: 'Xover C',
    description: 'IIR Crossover Filter C'
  },
  'iir_d': {
    displayName: 'Xover D',
    description: 'IIR Crossover Filter D'
  },
  'iir_e': {
    displayName: 'Xover E',
    description: 'IIR Crossover Filter E'
  },
  'iir_f': {
    displayName: 'Xover F',
    description: 'IIR Crossover Filter F'
  },
  'iir_g': {
    displayName: 'Xover G',
    description: 'IIR Crossover Filter G'
  },
  'iir_h': {
    displayName: 'Xover H',
    description: 'IIR Crossover Filter H'
  },
  'iir_i': {
    displayName: 'Xover I',
    description: 'IIR Crossover Filter I'
  },
  'iir_j': {
    displayName: 'Xover J',
    description: 'IIR Crossover Filter J'
  },
  'iir_k': {
    displayName: 'Xover K',
    description: 'IIR Crossover Filter K'
  },
  'iir_l': {
    displayName: 'Xover L',
    description: 'IIR Crossover Filter L'
  },
  'iir_m': {
    displayName: 'Xover M',
    description: 'IIR Crossover Filter M'
  },
  'iir_n': {
    displayName: 'Xover N',
    description: 'IIR Crossover Filter N'
  },
  'iir_o': {
    displayName: 'Xover O',
    description: 'IIR Crossover Filter O'
  },
  'iir_p': {
    displayName: 'Xover P',
    description: 'IIR Crossover Filter P'
  },
  'iir_q': {
    displayName: 'Xover Q',
    description: 'IIR Crossover Filter Q'
  },
  'iir_r': {
    displayName: 'Xover R',
    description: 'IIR Crossover Filter R'
  },
  'iir_s': {
    displayName: 'Xover S',
    description: 'IIR Crossover Filter S'
  },
  'iir_t': {
    displayName: 'Xover T',
    description: 'IIR Crossover Filter T'
  },
  'iir_u': {
    displayName: 'Xover U',
    description: 'IIR Crossover Filter U'
  },
  'iir_v': {
    displayName: 'Xover V',
    description: 'IIR Crossover Filter V'
  },
  'iir_w': {
    displayName: 'Xover W',
    description: 'IIR Crossover Filter W'
  },
  'iir_x': {
    displayName: 'Xover X',
    description: 'IIR Crossover Filter X'
  },
  'iir_y': {
    displayName: 'Xover Y',
    description: 'IIR Crossover Filter Y'
  },
  'iir_z': {
    displayName: 'Xover Z',
    description: 'IIR Crossover Filter Z'
  },
  
  // Common filter bank names
  'master': {
    displayName: 'Master',
    description: 'Master output filters'
  },
  'sub': {
    displayName: 'Sub',
    description: 'Subwoofer filters'
  },
  'subwoofer': {
    displayName: 'Subwoofer',
    description: 'Subwoofer filters'
  },
  'tweeter': {
    displayName: 'Tweeter',
    description: 'Tweeter filters'
  },
  'woofer': {
    displayName: 'Woofer',
    description: 'Woofer filters'
  },
  'midrange': {
    displayName: 'Midrange',
    description: 'Midrange filters'
  },
  'bass': {
    displayName: 'Bass',
    description: 'Bass filters'
  },
  'treble': {
    displayName: 'Treble',
    description: 'Treble filters'
  },
  'input': {
    displayName: 'Input',
    description: 'Input filters'
  },
  'output': {
    displayName: 'Output',
    description: 'Output filters'
  }
}

/**
 * Get the display name for a filter bank
 * @param internalName - The internal filter bank name
 * @returns The user-friendly display name, or the original name if no translation exists
 */
export function getFilterBankDisplayName(internalName: string): string {
  const translation = filterBankTranslations[internalName.toLowerCase()]
  return translation?.displayName || internalName
}

/**
 * Get the description for a filter bank
 * @param internalName - The internal filter bank name
 * @returns The description, or undefined if no translation exists
 */
export function getFilterBankDescription(internalName: string): string | undefined {
  const translation = filterBankTranslations[internalName.toLowerCase()]
  return translation?.description
}

/**
 * Check if a filter bank has a translation
 * @param internalName - The internal filter bank name
 * @returns True if a translation exists
 */
export function hasFilterBankTranslation(internalName: string): boolean {
  return internalName.toLowerCase() in filterBankTranslations
}

/**
 * Get all available filter bank translations
 * @returns Record of all translations
 */
export function getAllFilterBankTranslations(): Record<string, FilterBankTranslation> {
  return filterBankTranslations
}
