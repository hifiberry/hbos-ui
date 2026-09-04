import type { Filter as StoreFilter } from '@/stores/filter_backend_interface'
import type { Filter } from '@/utils/filtercalc'
import type { BiquadFilterType } from '@/utils/biquad'

// Map UI filter types to store filter types
const typeMapping: Record<string, StoreFilter['type']> = {
  'lowshelf': 'shelf-low',
  'peaking': 'peak',
  'highshelf': 'shelf-high',
  'highpass': 'highpass',
  'lowpass': 'lowpass',
  'bandpass': 'bandpass',
  'bandstop': 'bandstop',
  'allpass': 'allpass',
  'generic_normalized': 'generic'
}

// Map store filter types to UI filter icons (using supported BiquadFilterType values)
const iconMapping: Record<StoreFilter['type'], BiquadFilterType> = {
  'shelf-low': 'lowshelf',
  'peak': 'peaking',
  'shelf-high': 'highshelf',
  'highpass': 'highpass',
  'lowpass': 'lowpass',
  'bandpass': 'peaking', // Fallback to peaking for unsupported types
  'bandstop': 'peaking', // Fallback to peaking for unsupported types
  'allpass': 'peaking',  // Fallback to peaking for unsupported types
  'generic': 'generic_normalized'
}

const TRANSPARENT_COEFFS = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 } as const

export const convertUIFilterToStore = (uiFilter: Filter): Omit<StoreFilter, 'id'> => {
  const type = typeMapping[uiFilter.icon]
  if (!type) {
    throw new Error(
      `Unrecognised filter icon '${uiFilter.icon}' at ${uiFilter.frequency} Hz — refusing to ` +
      `substitute a peak filter for it.`
    )
  }

  const storeFilter: Omit<StoreFilter, 'id'> = {
    type,
    frequency: uiFilter.frequency,
    gain: uiFilter.gain,
    q: uiFilter.Q,
    enabled: uiFilter.enabled
  }

  // A generic biquad is defined by its coefficients alone. Dropping them here
  // is how a speaker preset used to be degraded into a peak filter at some
  // unrelated frequency.
  if (type === 'generic') {
    storeFilter.coefficients = { ...(uiFilter.genericCoeffs ?? TRANSPARENT_COEFFS) }
  }

  return storeFilter
}

export const convertStoreFilterToUI = (storeFilter: StoreFilter, id: string): Filter => {
  const uiFilter: Filter = {
    id: parseInt(id.split('_')[1]) || 0,
    icon: iconMapping[storeFilter.type] || 'peaking',
    text: storeFilter.frequency.toString(),
    frequency: storeFilter.frequency,
    gain: storeFilter.gain || 0,
    Q: storeFilter.q || 0.71,
    enabled: storeFilter.enabled
  }

  if (storeFilter.type === 'generic') {
    uiFilter.genericCoeffs = { ...(storeFilter.coefficients ?? TRANSPARENT_COEFFS) }
  }

  return uiFilter
}
