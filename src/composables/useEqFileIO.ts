/**
 * Composable for saving/loading EQ settings to/from JSON files.
 */

import { type Ref, type ComputedRef } from 'vue';
import { type Filter } from '@/utils/filtercalc';
import { useFilterStore } from '@/stores/filter_connector';
import { useToastStore } from '@/stores/toast';
import { convertUIFilterToStore } from '@/utils/filter-conversions';
import { type Filter as StoreFilter } from '@/stores/filter_backend_interface';

const EQ_FILE_PREFIX = 'speaker-eq';

/**
 * A filter as it appears in a saved EQ file, which is a verbatim dump of the
 * UI Filter objects at the time of saving.
 *
 * Files written before the field was renamed carry the filter kind under
 * `icon`. They are on users' disks and cannot be migrated, so loading has to
 * accept both spellings -- the rename was internal, and a file that used to
 * load must keep loading.
 */
type SavedFilter = Filter & { icon?: Filter['kind'] };

function fromSavedFile(saved: SavedFilter): Filter {
  if (saved.kind !== undefined) return saved;
  const { icon, ...rest } = saved;
  return { ...rest, kind: icon } as Filter;
}

/**
 * Apply a loaded set of per-channel filters to the hardware.
 *
 * Shared by the current and legacy file formats, which differ only in where
 * the per-channel arrays come from.
 *
 * Every channel is converted before any channel is written. A loaded file is
 * arbitrary user input and convertUIFilterToStore() now throws on a kind it
 * cannot map, so converting inside the write loop would put the file's EQ on
 * one channel and leave the old one on the other, behind a single toast.
 */
export async function applyLoadedChannelFilters(
  setBankFilters: (channel: string, filters: Omit<StoreFilter, 'id'>[]) => Promise<void>,
  channelNames: string[],
  source: Record<string, SavedFilter[]>
): Promise<Record<string, Filter[]>> {
  const prepared: Array<{
    channel: string;
    uiFilters: Filter[];
    storeFilters: Omit<StoreFilter, 'id'>[];
  }> = [];

  for (const ch of channelNames) {
    const loaded = source[ch];
    if (!loaded) continue;

    const uiFilters = loaded.map((saved: SavedFilter, index: number) => {
      const filter = fromSavedFile(saved);
      return {
        ...filter,
        frequency: Math.round(filter.frequency),
        id: Date.now() + index + channelNames.indexOf(ch) * 1000
      };
    });

    prepared.push({
      channel: ch,
      uiFilters,
      storeFilters: uiFilters.map(convertUIFilterToStore)
    });
  }

  const applied: Record<string, Filter[]> = {};

  for (const { channel, uiFilters, storeFilters } of prepared) {
    await setBankFilters(channel, storeFilters);
    applied[channel] = uiFilters;
  }

  return applied;
}

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let data: any;
          try {
            data = JSON.parse(e.target?.result as string);
          } catch (parseError) {
            console.error('speaker-equalizer: Error parsing Speaker EQ file:', parseError);
            toastStore.showErrorToast('Error loading Speaker EQ settings. Please check the file format.');
            return;
          }

          try {
            // Support new format (channelFilters Record)
            if (data.channelFilters) {
              Object.assign(channelFilters.value, await applyLoadedChannelFilters(
                (ch, f) => filterStore.setBankFilters(ch, f),
                channelNames.value,
                data.channelFilters
              ));
            }
            // Legacy format (leftFilters/rightFilters)
            else if (data.leftFilters && data.rightFilters) {
              const legacyMap: Record<string, Filter[]> = {
                left: data.leftFilters,
                right: data.rightFilters
              };
              Object.assign(channelFilters.value, await applyLoadedChannelFilters(
                (ch, f) => filterStore.setBankFilters(ch, f),
                channelNames.value,
                legacyMap
              ));
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
            const message = error instanceof Error ? error.message : String(error);
            toastStore.showErrorToast(`Error loading Speaker EQ settings: ${message}`);
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
