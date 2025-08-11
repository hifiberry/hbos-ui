import { computed, type ComputedRef } from 'vue';
import {
  type BiquadFilterType,
  calculateBiquadBandwidth,
  createBiquadFilter,
  FILTER_TYPES,
} from '@/utils/biquad';
import type { Filter } from '@/utils/filtercalc';

export function useBandwidthLines(currentFilter: ComputedRef<Filter>, sampleRate: number) {
  const activeFilterBandwidthStart = computed<number | null>(() => {
    const filter = currentFilter.value;
    if (filter.icon === 'generic_normalized') return null;
    if (typeof filter.Q === 'number' && filter.Q > 0 && filter.frequency > 0) {
      let biquadType: BiquadFilterType;
      switch (filter.icon) {
        case 'peaking': biquadType = FILTER_TYPES.PEAKING; break;
        case 'lowshelf': biquadType = FILTER_TYPES.LOWSHELF; break;
        case 'highshelf': biquadType = FILTER_TYPES.HIGHSHELF; break;
        default: biquadType = FILTER_TYPES.PEAKING;
      }
      const biquadFilter = createBiquadFilter(
        biquadType,
        filter.frequency,
        filter.gain || 0,
        filter.Q,
        sampleRate
      );
      const bandwidth = calculateBiquadBandwidth(biquadFilter);
      return bandwidth ? bandwidth.lowerFreq : null;
    }
    return null;
  });

  const activeFilterBandwidthEnd = computed<number | null>(() => {
    const filter = currentFilter.value;
    if (filter.icon === 'generic_normalized') return null;
    if (typeof filter.Q === 'number' && filter.Q > 0 && filter.frequency > 0) {
      let biquadType: BiquadFilterType;
      switch (filter.icon) {
        case 'peaking': biquadType = FILTER_TYPES.PEAKING; break;
        case 'lowshelf': biquadType = FILTER_TYPES.LOWSHELF; break;
        case 'highshelf': biquadType = FILTER_TYPES.HIGHSHELF; break;
        default: biquadType = FILTER_TYPES.PEAKING;
      }
      const biquadFilter = createBiquadFilter(
        biquadType,
        filter.frequency,
        filter.gain || 0,
        filter.Q,
        sampleRate
      );
      const bandwidth = calculateBiquadBandwidth(biquadFilter);
      return bandwidth ? bandwidth.upperFreq : null;
    }
    return null;
  });

  return {
    activeFilterBandwidthStart,
    activeFilterBandwidthEnd,
  };
}
