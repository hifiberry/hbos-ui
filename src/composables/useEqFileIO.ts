/**
 * Composable for saving/loading EQ settings to/from JSON files.
 */

import { type Ref } from 'vue';
import { type Filter } from '@/utils/filtercalc';
import { useFilterStore } from '@/stores/filter_connector';
import { useToastStore } from '@/stores/toast';
import { convertUIFilterToStore } from '@/utils/filter-conversions';

const EQ_FILE_PREFIX = 'speaker-eq';

type Channel = 'left' | 'right';
type ChannelMode = 'individual' | 'both';

export function useEqFileIO(
  leftFilters: Ref<Filter[]>,
  rightFilters: Ref<Filter[]>,
  activeChannel: Ref<Channel>,
  channelMode: Ref<ChannelMode>,
  filters: { value: Filter[] },
  activeFilterId: Ref<number | null>
) {
  const filterStore = useFilterStore();
  const toastStore = useToastStore();

  function saveEQSettings() {
    const data = {
      filters: filters.value,
      leftFilters: leftFilters.value,
      rightFilters: rightFilters.value,
      channelMode: channelMode.value,
      activeChannel: activeChannel.value,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${EQ_FILE_PREFIX}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function loadEQSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            if (data.leftFilters && data.rightFilters) {
              leftFilters.value = data.leftFilters.map((filter: Filter, index: number) => ({
                ...filter,
                frequency: Math.round(filter.frequency),
                id: Date.now() + index
              }));
              rightFilters.value = data.rightFilters.map((filter: Filter, index: number) => ({
                ...filter,
                frequency: Math.round(filter.frequency),
                id: Date.now() + index + 1000
              }));

              await filterStore.clearFiltersFromBank('left');
              await filterStore.clearFiltersFromBank('right');

              for (const [index, filter] of leftFilters.value.entries()) {
                await filterStore.addFilter('left', index, convertUIFilterToStore(filter));
              }
              for (const [index, filter] of rightFilters.value.entries()) {
                await filterStore.addFilter('right', index, convertUIFilterToStore(filter));
              }

              const currentFilters = filters.value;
              if (currentFilters.length > 0) {
                activeFilterId.value = currentFilters[0].id;
              }

              if (data.channelMode) channelMode.value = data.channelMode;
              if (data.activeChannel) activeChannel.value = data.activeChannel;
            }
          } catch (error) {
            console.error('speaker-equalizer: Error loading Speaker EQ settings:', error);
            toastStore.showErrorToast('Error loading Speaker EQ settings. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  return {
    saveEQSettings,
    loadEQSettings,
  };
}
