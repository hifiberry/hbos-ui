/**
 * Composable for loading Room EQ configurations into the speaker equalizer.
 */

import { ref, type Ref } from 'vue';
import { type Filter } from '@/utils/filtercalc';
import { type BiquadFilterType } from '@/utils/biquad';
import { getConfigKeys, getConfigValue } from '@/api/config';
import { useFilterStore } from '@/stores/filter_connector';
import { useToastStore } from '@/stores/toast';
import { convertUIFilterToStore } from '@/utils/filter-conversions';
import { formatFilterTypeName } from '@/utils/filter-display';

interface RoomEQConfig {
  name: string;
  filters: Array<{
    filter_type: string;
    frequency: number;
    gain_db: number;
    q: number;
    description?: string;
  }>;
  created_at: string;
}

export interface RoomEQConfigItem {
  key: string;
  data: RoomEQConfig;
}

export function useRoomEQ(
  channelNames: Ref<string[]>,
  channelFilters: Ref<Record<string, Filter[]>>,
  activeFilterId: Ref<number | null>
) {
  const filterStore = useFilterStore();
  const toastStore = useToastStore();

  const showRoomEQModal = ref(false);
  const loadingRoomEQConfigs = ref(false);
  const roomEQConfigs = ref<RoomEQConfigItem[]>([]);

  function convertRoomEQFilterToSpeakerEQ(roomEQFilter: { filter_type: string; frequency: number; gain_db: number; q: number }, index: number): Filter {
    const filterTypeMap: Record<string, BiquadFilterType> = {
      'hp': 'highpass',
      'lp': 'lowpass',
      'eq': 'peaking',
      'peak': 'peaking',
      'peaking': 'peaking',
      'lowpass': 'lowpass',
      'highpass': 'highpass',
      'lowshelf': 'lowshelf',
      'highshelf': 'highshelf'
    };

    const filterType = filterTypeMap[roomEQFilter.filter_type] || 'peaking';

    return {
      id: Date.now() + index,
      icon: filterType,
      text: formatFilterTypeName(filterType),
      frequency: Math.round(roomEQFilter.frequency),
      gain: roomEQFilter.gain_db,
      Q: roomEQFilter.q,
      enabled: true
    };
  }

  async function loadRoomEQSettings() {
    showRoomEQModal.value = true;
    loadingRoomEQConfigs.value = true;
    roomEQConfigs.value = [];

    try {
      const configs: RoomEQConfigItem[] = [];
      const keysResponse = await getConfigKeys('correction-filters.');

      if (keysResponse.status === 'success' && keysResponse.data && Array.isArray(keysResponse.data)) {
        for (const key of keysResponse.data) {
          if (key.startsWith('correction-filters.')) {
            try {
              const valueResponse = await getConfigValue(key);
              if (valueResponse.status === 'success' && valueResponse.data?.value) {
                const configData = JSON.parse(valueResponse.data.value) as RoomEQConfig;
                configs.push({ key, data: configData });
              }
            } catch (parseError) {
              console.warn(`speaker-equalizer: Failed to parse Room EQ config ${key}:`, parseError);
            }
          }
        }
      }

      configs.sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime());
      roomEQConfigs.value = configs;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        console.log('speaker-equalizer: No Room EQ configurations found (404)');
      } else {
        console.error('speaker-equalizer: Failed to load Room EQ configurations:', error);
      }
      roomEQConfigs.value = [];
    } finally {
      loadingRoomEQConfigs.value = false;
    }
  }

  async function loadSelectedRoomEQConfig(config: RoomEQConfigItem, targetMode: 'left' | 'right' | 'both') {
    try {
      const convertedFilters = config.data.filters.map(convertRoomEQFilterToSpeakerEQ);

      // Map 'left'/'right'/'both' to actual channel names
      const channels = channelNames.value;
      const channelsToApply: string[] = [];
      if (targetMode === 'both') {
        channelsToApply.push(...channels);
      } else if (targetMode === 'left' && channels.length > 0) {
        channelsToApply.push(channels[0]);
      } else if (targetMode === 'right' && channels.length > 1) {
        channelsToApply.push(channels[1]);
      }

      for (const ch of channelsToApply) {
        await filterStore.clearFiltersFromBank(ch);
        channelFilters.value[ch] = [...convertedFilters];
        for (const [index, filter] of convertedFilters.entries()) {
          await filterStore.addFilter(ch, index, convertUIFilterToStore(filter));
        }
      }

      if (convertedFilters.length > 0) {
        activeFilterId.value = convertedFilters[0].id;
      }

      showRoomEQModal.value = false;
      console.log(`speaker-equalizer: Loaded Room EQ configuration "${config.data.name}" to ${targetMode} channel(s)`);
    } catch (error) {
      console.error('speaker-equalizer: Failed to load Room EQ configuration:', error);
      toastStore.showErrorToast('Error loading Room EQ configuration. Please try again.');
    }
  }

  return {
    showRoomEQModal,
    loadingRoomEQConfigs,
    roomEQConfigs,
    loadRoomEQSettings,
    loadSelectedRoomEQConfig,
  };
}
