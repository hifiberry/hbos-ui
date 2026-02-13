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
  'generic_normalized': 'peak' // fallback mapping
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
  'allpass': 'peaking'   // Fallback to peaking for unsupported types
}

export const convertUIFilterToStore = (uiFilter: Filter): Omit<StoreFilter, 'id'> => ({
  type: typeMapping[uiFilter.icon] || 'peak',
  frequency: uiFilter.frequency,
  gain: uiFilter.gain,
  q: uiFilter.Q,
  enabled: uiFilter.enabled
})

export const convertStoreFilterToUI = (storeFilter: StoreFilter, id: string): Filter => ({
  id: parseInt(id.split('_')[1]) || 0,
  icon: iconMapping[storeFilter.type] || 'peaking',
  text: storeFilter.frequency.toString(),
  frequency: storeFilter.frequency,
  gain: storeFilter.gain || 0,
  Q: storeFilter.q || 0.71,
  enabled: storeFilter.enabled
})
