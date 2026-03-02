/**
 * Composable for saving/loading EQ settings to/from JSON files.
 */

import { type Ref, type ComputedRef } from 'vue';
import { type Filter } from '@/utils/filtercalc';
import { useFilterStore } from '@/stores/filter_connector';
import { useToastStore } from '@/stores/toast';
import { convertUIFilterToStore } from '@/utils/filter-conversions';

const EQ_FILE_PREFIX = 'speaker-eq';

export function useEqFileIO(
  channelNames: Ref<string[]>,
  channelFilters: Ref<Record<string, Filter[]>>,
  activeChannel: Ref<string>,
  channelMode: ComputedRef<string>,
  filters: { value: Filter[] },
  activeFilterId: Ref<number | null>
) {
  const filterStore = useFilterStore();
  const toastStore = useToastStore();

  function saveEQSettings() {
    const data = {
      filters: filters.value,
      channelFilters: {} as Record<string, Filter[]>,
      channelNames: channelNames.value,
      channelMode: channelMode.value,
      activeChannel: activeChannel.value,
      timestamp: new Date().toISOString()
    };

    // Save all channel filters
    for (const ch of channelNames.value) {
      data.channelFilters[ch] = channelFilters.value[ch] ?? [];
    }

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

            // Support new format (channelFilters Record)
            if (data.channelFilters) {
              for (const ch of channelNames.value) {
                if (data.channelFilters[ch]) {
                  channelFilters.value[ch] = data.channelFilters[ch].map((filter: Filter, index: number) => ({
                    ...filter,
                    frequency: Math.round(filter.frequency),
                    id: Date.now() + index + channelNames.value.indexOf(ch) * 1000
                  }));

                  await filterStore.clearFiltersFromBank(ch);
                  for (const [index, filter] of channelFilters.value[ch].entries()) {
                    await filterStore.addFilter(ch, index, convertUIFilterToStore(filter));
                  }
                }
              }
            }
            // Legacy format (leftFilters/rightFilters)
            else if (data.leftFilters && data.rightFilters) {
              const legacyMap: Record<string, Filter[]> = {
                left: data.leftFilters,
                right: data.rightFilters
              };
              for (const ch of channelNames.value) {
                const legacyFilters = legacyMap[ch];
                if (legacyFilters) {
                  channelFilters.value[ch] = legacyFilters.map((filter: Filter, index: number) => ({
                    ...filter,
                    frequency: Math.round(filter.frequency),
                    id: Date.now() + index + channelNames.value.indexOf(ch) * 1000
                  }));

                  await filterStore.clearFiltersFromBank(ch);
                  for (const [index, filter] of channelFilters.value[ch].entries()) {
                    await filterStore.addFilter(ch, index, convertUIFilterToStore(filter));
                  }
                }
              }
            }

            const currentFilters = filters.value;
            if (currentFilters.length > 0) {
              activeFilterId.value = currentFilters[0].id;
            }

            if (data.activeChannel && channelNames.value.includes(data.activeChannel)) {
              activeChannel.value = data.activeChannel;
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
