import type { BiquadFilterType } from '@/utils/biquad'

export const getFilterIconName = (type: BiquadFilterType): string => {
  switch (type) {
    case 'lowshelf': return 'filter-low-shelf'
    case 'peaking': return 'filter-peak'
    case 'highshelf': return 'filter-high-shelf'
    case 'highpass': return 'filter-high-pass'
    case 'lowpass': return 'filter-low-pass'
    case 'generic_normalized': return 'filter-peak'
    default: return 'filter-peak'
  }
}

export const formatFilterTypeName = (type: BiquadFilterType): string => {
  switch (type) {
    case 'lowshelf': return 'Low\nShelf'
    case 'peaking': return 'Peaking\nEQ'
    case 'highshelf': return 'High\nShelf'
    case 'generic_normalized': return 'Generic\nBiquad'
    default: return type
  }
}
