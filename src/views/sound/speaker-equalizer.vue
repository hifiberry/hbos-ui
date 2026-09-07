<template>
<PageContent
  :title="`Speaker Equalizer ${channelMode === 'both' ? 'Both' : (activeChannel === channelNames[0] ? 'Left' : 'Right')}`"
  :backrouterLink="{ name: 'sound' }"
  :headerHasContentBelow=true
>
  <div class="sound">
    <div class="page-header">
      <div class="title-section">
        <div class="backend-info" v-if="backendName">
          <span class="backend-name" @click="showBackendInfoModal = true">{{ backendName }}</span>
          <span class="filter-limits" v-if="currentChannelFilterInfo">
            • {{ currentChannelFilterInfo.currentFilterCount }}/{{ currentChannelFilterInfo.maxFilters }} filters
          </span>
        </div>
      </div>
      <div class="header-actions">
        <Icon icon="link"
          @click="guardedToggleChannelMode"
          title="Channel Mode"
          :class="{ linked: channelMode === 'both', 'icon-disabled': isPresetOwned }"
          class="icon-btn" />
        <Icon icon="ear"
          @mousedown="startBypass"
          @mouseup="endBypass"
          @mouseleave="endBypass"
          @touchstart="startBypass"
          @touchend="endBypass"
          :class="{ bypassed: isBypassed }"
          class="icon-btn"
          title="Bypass" />
        <Icon icon="tabler/armchair" @click="guardedLoadRoomEQSettings" title="Load Room EQ Configuration"
          :class="{ 'icon-disabled': isPresetOwned }" class="icon-btn" />
        <Icon icon="folder_open" @click="guardedLoadEQSettings" title="Load EQ Settings"
          :class="{ 'icon-disabled': isPresetOwned }" class="icon-btn" />
        <Icon icon="save" @click="saveEQSettings" title="Save EQ Settings" class="icon-btn" />
      </div>
    </div>

    <div v-if="isPresetOwned" class="preset-lock-banner" data-test="preset-lock-banner">
      <Icon icon="lock" class="banner-icon" />
      <div class="banner-text">
        <p>{{ lockMessage }}</p>
      </div>
      <button class="banner-action" data-test="clear-preset" @click="showClearDialog = true">
        Clear preset and edit freely
      </button>
    </div>

    <div class="card">
      <div class="graph">
        <FilterGraph
          :filters="filters"
          :active-filter-id="activeFilterId"
          :show-bandwidth-lines="true"
          :sample-rate="SAMPLE_RATE"
          @set-active-filter="activeFilterId = $event"
          @update:freq-gain="guardedUpdateFreqGain"
          @update:q="guardedUpdateQ"
          @drag-start="guardedDragStart"
          @drag-end="guardedDragEnd"
        />
      </div>
    </div>

    <div class="card mt-3">
      <div class="equaliser-panel">
        <div class="tabs">
          <button
            v-for="ch in channelNames"
            :key="ch"
            :class="['tab', { active: channelMode === 'both' || activeChannel === ch }]"
            @click="setActiveChannel(ch)"
          >
            {{ ch === channelNames[0] ? 'Left' : 'Right' }}
          </button>
        </div>

        <div class="filters-list" :class="{ 'preset-locked': isPresetOwned }">
          <div v-for="filter in filters" :key="filter.id" class="card">
            <EqFilterItem
              :filter="filter"
              :is-active="activeFilterId === filter.id"
              @select="activeFilterId = $event"
              @remove="guardedRemoveFilter"
              @toggle-enabled="guardedToggleFilterEnabled"
              @increment-frequency="guardedIncrementFrequency"
              @decrement-frequency="guardedDecrementFrequency"
              @increment-gain="guardedIncrementGain"
              @decrement-gain="guardedDecrementGain"
              @widen-band="guardedWidenBand"
              @narrow-band="guardedNarrowBand"
              @update-generic-coeff="guardedUpdateGenericCoeff"
            />
          </div>

          <div class="card">
            <div class="filter-item add-filter-item"
                 :class="{ disabled: !canAddFilter }"
                 data-test="add-filter"
                 @click="canAddFilter && (showAddFilterModal = true)">
              <div class="filter-main">
                <div class="filter-info">
                  <Icon icon="plus" class="filter-icon" />
                  <div class="filter-details">
                    <h3 v-if="isPresetOwned">Preset Filters — Read Only</h3>
                    <h3 v-else>{{ canAddFilter ? 'Add New Filter' : 'Maximum Filters Reached' }}</h3>
                    <div class="filter-frequency">
                      <span v-if="currentChannelFilterInfo">
                        {{ currentChannelFilterInfo.currentFilterCount }}/{{ currentChannelFilterInfo.maxFilters }} filters
                      </span>
                      <span v-else-if="canAddFilter">Click to add</span>
                      <span v-else>Cannot add more filters</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <AddFilterModal
    :open="showAddFilterModal"
    :filter-types="AVAILABLE_FILTER_TYPES"
    @close="showAddFilterModal = false"
    @add="guardedAddFilter"
  />

  <BackendInfoModal
    :open="showBackendInfoModal"
    :capabilities="backendCapabilities"
    @close="showBackendInfoModal = false"
  />

  <ConfirmationDialog
    :is-open="showClearDialog"
    title="Clear speaker preset?"
    :message="clearConfirmationMessage"
    confirm-button-text="Clear preset"
    :is-dangerous="true"
    :disabled="isClearing"
    icon="lock"
    @close="showClearDialog = false"
    @confirm="handleClearPreset"
  />

  <RoomEqLoaderModal
    :open="showRoomEQModal"
    :loading="loadingRoomEQConfigs"
    :configs="roomEQConfigs"
    @close="showRoomEQModal = false"
    @load="handleLoadRoomEQ"
  />
</PageContent>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import Icon from '@/components/Icon.vue';
import PageContent from '@/components/PageContent.vue';
import FilterGraph from '@/components/FilterGraph.vue';
import EqFilterItem from '@/components/speaker-eq/EqFilterItem.vue';
import AddFilterModal from '@/components/speaker-eq/AddFilterModal.vue';
import BackendInfoModal from '@/components/speaker-eq/BackendInfoModal.vue';
import RoomEqLoaderModal, { type RoomEQConfigItem } from '@/components/speaker-eq/RoomEqLoaderModal.vue';
import ConfirmationDialog from '@/components/ConfirmationDialog.vue';

import { type BiquadFilterType } from '@/utils/biquad';
import { useEqFilters } from '@/composables/useEqFilters';
import { useBypass } from '@/composables/useBypass';
import { useEqFileIO } from '@/composables/useEqFileIO';
import { useRoomEQ } from '@/composables/useRoomEQ';
import { usePresetLock } from '@/composables/usePresetLock';

// Available filter types for the UI
const AVAILABLE_FILTER_TYPES: BiquadFilterType[] = ['lowshelf', 'peaking', 'highshelf', 'generic_normalized'];

// --- Composables ---
const {
  channelNames,
  activeChannel,
  channelMode,
  channelFilters,
  activeFilterId,
  isDragging,
  backendCapabilities,
  backendName,
  bankAddresses,
  filters,
  canAddFilterToCurrentChannel,
  currentChannelFilterInfo,
  isCurrentPairLinked,
  initialize,
  loadBackendCapabilities,
  loadFiltersFromBackend,
  setActiveChannel,
  toggleChannelMode,
  addFilterOfType,
  removeFilter,
  toggleFilterEnabled,
  incrementFilterFrequency,
  decrementFilterFrequency,
  incrementFilterGain,
  decrementFilterGain,
  widenFilterBand,
  narrowFilterBand,
  updateGenericCoeff,
  onGraphUpdateFreqGain,
  onGraphUpdateQ,
  onGraphDragStart,
  onGraphDragEnd,
  SAMPLE_RATE,
} = useEqFilters();

// Bypass: resolve bank addresses for the active channel (and partner if linked)
const { isBypassed, startBypass, endBypass } = useBypass(() => {
  const banks: string[] = [];
  const addr = bankAddresses.value[activeChannel.value];
  if (addr) banks.push(addr);

  if (isCurrentPairLinked.value) {
    for (const ch of channelNames.value) {
      if (ch !== activeChannel.value) {
        const partnerAddr = bankAddresses.value[ch];
        if (partnerAddr) banks.push(partnerAddr);
      }
    }
  }
  return banks;
}, isDragging);

const { saveEQSettings, loadEQSettings } = useEqFileIO(
  channelNames, channelFilters, activeChannel, channelMode, filters, activeFilterId
);

const {
  showRoomEQModal,
  loadingRoomEQConfigs,
  roomEQConfigs,
  loadRoomEQSettings,
  loadSelectedRoomEQConfig,
} = useRoomEQ(channelNames, channelFilters, activeFilterId);

// --- Speaker preset ownership ---
// A bank written by a speaker preset holds raw-coefficient filters. They stay
// visible and the curve stays correct, but every path that rewrites the bank
// is closed — including loading a Room EQ correction or a saved EQ file,
// which would overwrite the preset just as thoroughly as a band edit.
const {
  isPresetOwned,
  lockMessage,
  clearConfirmationMessage,
  showClearDialog,
  isClearing,
  loadAppliedPreset,
  readOnly,
  confirmClearPreset,
} = usePresetLock(filters);

const canAddFilter = computed(() => canAddFilterToCurrentChannel.value && !isPresetOwned.value);

// Linking the channels copies the active channel's filters over its partner,
// which would overwrite the partner's share of the preset just as thoroughly.
const guardedToggleChannelMode = readOnly(toggleChannelMode);
const guardedRemoveFilter = readOnly(removeFilter);
const guardedToggleFilterEnabled = readOnly(toggleFilterEnabled);
const guardedIncrementFrequency = readOnly(incrementFilterFrequency);
const guardedDecrementFrequency = readOnly(decrementFilterFrequency);
const guardedIncrementGain = readOnly(incrementFilterGain);
const guardedDecrementGain = readOnly(decrementFilterGain);
const guardedWidenBand = readOnly(widenFilterBand);
const guardedNarrowBand = readOnly(narrowFilterBand);
const guardedUpdateGenericCoeff = readOnly(updateGenericCoeff);
const guardedUpdateFreqGain = readOnly(onGraphUpdateFreqGain);
const guardedUpdateQ = readOnly(onGraphUpdateQ);
const guardedDragStart = readOnly(onGraphDragStart);
const guardedDragEnd = readOnly(onGraphDragEnd);
// Adding is guarded here too, not only by disabling the tile that opens the
// modal. The tile is the sole way in today, so this changes nothing now --
// but every other mutating path is stopped at the handler, and an add that
// got through would rewrite the bank exactly like the rest of them.
const guardedAddFilter = readOnly(handleAddFilter);
const guardedLoadRoomEQSettings = readOnly(loadRoomEQSettings);
const guardedLoadEQSettings = readOnly(loadEQSettings);

async function handleClearPreset() {
  await confirmClearPreset(async () => {
    await loadFiltersFromBackend();
    await loadBackendCapabilities();
  });
}

// --- Modal state ---
const showAddFilterModal = ref(false);
const showBackendInfoModal = ref(false);

// --- Event handlers ---
async function handleAddFilter(type: BiquadFilterType) {
  await addFilterOfType(type);
  showAddFilterModal.value = false;
}

async function handleLoadRoomEQ(config: RoomEQConfigItem, channelMode: 'left' | 'right' | 'both') {
  await loadSelectedRoomEQConfig(config, channelMode);
}

// --- Keyboard shortcuts ---
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (showAddFilterModal.value) {
      showAddFilterModal.value = false;
    } else if (showBackendInfoModal.value) {
      showBackendInfoModal.value = false;
    } else if (showRoomEQModal.value) {
      showRoomEQModal.value = false;
    }
  }

  if (e.code === 'Space' && !showAddFilterModal.value && !showBackendInfoModal.value && !showRoomEQModal.value) {
    e.preventDefault();
    startBypass();
  }
};

const handleKeyup = (e: KeyboardEvent) => {
  if (e.code === 'Space' && !showAddFilterModal.value && !showBackendInfoModal.value) {
    e.preventDefault();
    endBypass();
  }
};

// --- Lifecycle ---
onMounted(async () => {
  const route = useRoute();

  await initialize();
  await loadAppliedPreset();

  // Check for Room EQ query parameters
  // Not even by deep link: applying a Room EQ correction rewrites the bank a
  // speaker preset owns.
  if (route.query.applyRoomEQ && route.query.channel && !isPresetOwned.value) {
    await loadRoomEQSettings();
    const roomEQKey = route.query.applyRoomEQ as string;
    const channel = route.query.channel as 'left' | 'right' | 'both';

    const config = roomEQConfigs.value.find(c => c.key === roomEQKey);
    if (config) {
      await loadSelectedRoomEQConfig(config, channel);
    }
  }

  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('keyup', handleKeyup);
});

// --- Watchers ---
watch(channelFilters, () => {
  for (const ch of channelNames.value) {
    const chFilters = channelFilters.value[ch];
    if (chFilters) {
      chFilters.forEach((f) => { f.text = `${f.frequency}`; });
    }
  }
}, { deep: true });

watch(activeChannel, async () => {
  await loadBackendCapabilities();
});
</script>

<style scoped lang="scss">
.sound {
  padding: 20px;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .backend-info {
      font-size: 14px;
      color: #aaa;
      display: flex;
      align-items: center;
      gap: 8px;

      .backend-name {
        font-weight: 500;
        cursor: pointer;
        color: #00b8ff;
        text-decoration: underline;

        &:hover { color: #0096cc; }
      }

      .filter-limits {
        color: #00b8ff;
        font-weight: 500;
      }
    }

    .header-actions {
      display: flex;
      gap: 20px;

      .icon-btn {
        cursor: pointer;
        width: 24px;
        height: 24px;
        stroke: var(--color-icon);
        transition: opacity 0.2s ease;

        &:hover { opacity: 0.5; }
        &.linked { stroke: red; }
        &.bypassed { stroke: blue; }

        // A preset owns the bank: loading a Room EQ correction or a saved EQ
        // file would overwrite it.
        &.icon-disabled { opacity: 0.35; cursor: not-allowed; }
      }
    }
  }

  .preset-lock-banner {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding: 14px 16px;
    margin-bottom: 20px;
    border-radius: 8px;
    background: rgba(0, 184, 255, 0.08);
    border: 1px solid rgba(0, 184, 255, 0.4);

    .banner-icon {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
      stroke: #00b8ff;
    }

    .banner-text {
      flex: 1;
      min-width: 200px;

      p {
        margin: 0;
        font-size: 14px;
        line-height: 1.4;
        color: var(--color-text);
      }
    }

    .banner-action {
      padding: 8px 16px;
      border: 1px solid rgba(112, 112, 112, 0.5);
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.1);
      color: var(--color-text);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(225, 30, 74, 0.2);
        border-color: var(--primary, #e11e4a);
      }
    }
  }

  .card {
    padding: 10px;
    margin-bottom: 20px;
    border-radius: 8px;
    width: 100%;
  }

  .graph {
    position: relative;
    border-radius: 8px;
    width: 100%;
    user-select: none;
  }

  .equaliser-panel {
    .tabs {
      display: flex;

      .tab {
        flex: 1 1 50%;
        padding: 14px;
        cursor: pointer;
        font-family: 'Metropolis', sans-serif;
        font-size: 20px;
        border: 1px solid #333;
        border-right: none;
        transition: all 0.2s ease-in-out;
        background-color: transparent;
        color: #707070;

        &:first-child { border-radius: 8px 0 0 8px; }

        &:last-child {
          border-radius: 0 8px 8px 0;
          border-right: 1px solid #333;
        }

        &.active {
          background: var(--primary, #e11e4a);
          color: white;
          border-color: var(--primary, #e11e4a);
        }
      }
    }

    .filters-list {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 15px;

      // Read-only, not hidden: the filters a preset wrote stay legible and
      // the count stays honest; only the controls that would rewrite the
      // bank stop responding.
      &.preset-locked {
        :deep(.filter-item) {
          pointer-events: none;
          opacity: 0.75;
        }

        :deep(input),
        :deep(button) {
          pointer-events: none;
        }
      }

      .filter-item {
        padding: 20px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(112, 112, 112, 0.3);
        transition: all 0.2s ease-in-out;
        cursor: pointer;

        &.add-filter-item {
          border-style: dashed;

          &:hover:not(.disabled) {
            border-color: var(--primary, #e11e4a);
            background: rgba(225, 30, 74, 0.05);
          }

          &.disabled {
            cursor: not-allowed;
            opacity: 0.5;
          }
        }

        .filter-main {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .filter-info {
            display: flex;
            align-items: center;
            gap: 15px;

            .filter-icon {
              width: 32px;
              height: 32px;
            }

            .filter-details h3 {
              font-size: 18px;
              font-weight: 500;
              margin: 0 0 5px 0;
            }

            .filter-frequency {
              font-size: 14px;
              color: #666;
            }
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .sound {
    padding: 10px;

    .equaliser-panel .tabs .tab {
      font-size: 16px;
      padding: 10px;
    }
  }
}
</style>
