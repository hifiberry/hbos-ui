<template>
<PageContent
  :title="`Crossover Design — Channel ${activeChannel.replace(/^iir_/i, '').toUpperCase()}`"
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
          v-if="getPairPartner(activeChannel)"
          @click="guardedTogglePairLink()"
          title="Link Channel Pair"
          :class="{ linked: isCurrentPairLinked, 'icon-disabled': isPresetOwned }"
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
          <template v-for="(ch, idx) in channelNames" :key="ch">
            <div v-if="idx > 0 && idx % 2 === 0" class="tab-pair-separator" />
            <button
              :class="['tab', {
                active: activeChannel === ch || (isChannelLinkedToActive(ch)),
              }]"
              @click="setActiveChannel(ch)"
            >
              {{ ch.replace('iir_', '').toUpperCase() }}
            </button>
          </template>
        </div>

        <div v-if="activeChannelFeatures && hasAnyChannelFeature" class="channel-settings">
          <div v-if="activeChannelFeatures.hasDelay" class="setting-group">
            <label>Delay</label>
            <div class="setting-control stepper">
              <button class="step-btn" @click="stepDelay(-0.1)">
                <Icon icon="minus-small" />
              </button>
              <span class="setting-value">{{ getChannelDelayMs(activeChannel).toFixed(1) }} ms</span>
              <button class="step-btn" @click="stepDelay(0.1)">
                <Icon icon="plus-small" />
              </button>
            </div>
          </div>

          <div v-if="activeChannelFeatures.hasLevel" class="setting-group">
            <label>Level{{ isCurrentPairLinked ? ' (linked)' : '' }}</label>
            <div class="setting-control stepper">
              <button class="step-btn" @click="stepLevel(-0.1)">
                <Icon icon="minus-small" />
              </button>
              <span class="setting-value">{{ getChannelLevelDb(activeChannel).toFixed(1) }} dB</span>
              <button class="step-btn" @click="stepLevel(0.1)">
                <Icon icon="plus-small" />
              </button>
            </div>
          </div>

          <div v-if="activeChannelFeatures.hasInvert" class="setting-group">
            <label>Invert Polarity</label>
            <div class="setting-control">
              <button
                class="toggle-btn"
                :class="{ active: channelSettings[activeChannel]?.inverted }"
                @click="setChannelInvert(activeChannel, !channelSettings[activeChannel]?.inverted)"
              >
                {{ channelSettings[activeChannel]?.inverted ? 'Inverted' : 'Normal' }}
              </button>
            </div>
          </div>

          <div v-if="activeChannelFeatures.hasChannelSelect" class="setting-group">
            <label>Input Source</label>
            <div class="setting-control segmented-buttons">
              <button v-for="opt in channelSelectOptions" :key="opt.value"
                :class="{ active: channelSettings[activeChannel]?.channelSelect === opt.value }"
                @click="setChannelSelectMode(activeChannel, opt.value)"
              >{{ opt.label }}</button>
            </div>
          </div>

          <div class="setting-group reset-group">
            <label>&nbsp;</label>
            <div class="setting-control">
              <button class="toggle-btn" @click="resetChannelSettings">Reset</button>
            </div>
          </div>
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
</PageContent>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import Icon from '@/components/Icon.vue';
import PageContent from '@/components/PageContent.vue';
import FilterGraph from '@/components/FilterGraph.vue';
import EqFilterItem from '@/components/speaker-eq/EqFilterItem.vue';
import AddFilterModal from '@/components/speaker-eq/AddFilterModal.vue';
import BackendInfoModal from '@/components/speaker-eq/BackendInfoModal.vue';
import ConfirmationDialog from '@/components/ConfirmationDialog.vue';

import { type BiquadFilterType } from '@/utils/biquad';
import { useCrossoverFilters } from '@/composables/useCrossoverFilters';
import { useBypass } from '@/composables/useBypass';
import { usePresetLock } from '@/composables/usePresetLock';

// Available filter types for crossover design (includes highpass/lowpass)
const AVAILABLE_FILTER_TYPES: BiquadFilterType[] = [
  'highpass', 'lowshelf', 'peaking', 'highshelf', 'lowpass', 'generic_normalized'
];

// --- Composables ---
const {
  channelNames,
  activeChannel,
  channelFilters,
  activeFilterId,
  isDragging,
  backendCapabilities,
  backendName,
  filters,
  canAddFilterToCurrentChannel,
  currentChannelFilterInfo,
  isCurrentPairLinked,
  getPairPartner,
  getPairKey,
  togglePairLink,
  initialize,
  loadBackendCapabilities,
  loadFiltersFromBackend,
  setActiveChannel,
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
  channelSettings,
  channelFeatures,
  setChannelDelay,
  setChannelLevel,
  setChannelInvert,
  setChannelSelectMode,
  getChannelDelayMs,
  getChannelLevelDb,
  SAMPLE_RATE,
} = useCrossoverFilters();

// --- Speaker preset ownership ---
// A bank written by a speaker preset holds raw-coefficient filters. They stay
// visible and the curve stays correct, but every editing path is closed: this
// editor rewrites a whole bank per edit, which would destroy the preset.
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

// Linking a pair copies the active channel's filters over its partner, which
// would overwrite the partner's share of the preset just as thoroughly.
const guardedTogglePairLink = readOnly(togglePairLink);
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

async function handleClearPreset() {
  await confirmClearPreset(async () => {
    await loadFiltersFromBackend();
    await loadBackendCapabilities();
  });
}

const channelSelectOptions = [
  { value: 0, label: 'L' },
  { value: 1, label: 'R' },
  { value: 2, label: 'Mono' },
  { value: 3, label: 'Surround' },
];

const activeChannelFeatures = computed(() => channelFeatures.value[activeChannel.value]);
const hasAnyChannelFeature = computed(() => {
  const f = activeChannelFeatures.value;
  return f && (f.hasDelay || f.hasLevel || f.hasInvert || f.hasChannelSelect);
});

function stepDelay(delta: number) {
  const current = getChannelDelayMs(activeChannel.value);
  const next = Math.max(0, Math.min(10, Math.round((current + delta) * 10) / 10));
  setChannelDelay(activeChannel.value, next);
}

function stepLevel(delta: number) {
  const current = getChannelLevelDb(activeChannel.value);
  const next = Math.max(-60, Math.min(6, Math.round((current + delta) * 10) / 10));
  setChannelLevel(activeChannel.value, next);
}

async function resetChannelSettings() {
  const ch = activeChannel.value;
  const features = activeChannelFeatures.value;
  if (!features) return;

  // Even channels (0,2,4,6 = A,C,E,G) → left(0), odd (1,3,5,7 = B,D,F,H) → right(1)
  const idx = channelNames.value.indexOf(ch);
  const defaultInput = idx % 2 === 0 ? 0 : 1;

  if (features.hasDelay) await setChannelDelay(ch, 0);
  if (features.hasLevel) await setChannelLevel(ch, 0);
  if (features.hasInvert) await setChannelInvert(ch, false);
  if (features.hasChannelSelect) await setChannelSelectMode(ch, defaultInput);
}

// Bypass: resolve bank addresses for the active channel (and partner if linked)
const { isBypassed, startBypass, endBypass } = useBypass(() => {
  const banks: string[] = [];
  const caps = backendCapabilities.value;
  if (!caps) return banks;

  const addBank = (ch: string) => {
    const bankInfo = caps.availableFilterBanks.find(b => b.name === ch);
    if (bankInfo?.bankAddress) banks.push(bankInfo.bankAddress);
  };

  addBank(activeChannel.value);
  if (isCurrentPairLinked.value) {
    const partner = getPairPartner(activeChannel.value);
    if (partner) addBank(partner);
  }
  return banks;
}, isDragging);

// --- Modal state ---
const showAddFilterModal = ref(false);
const showBackendInfoModal = ref(false);

// --- Helpers ---
function isChannelLinkedToActive(ch: string): boolean {
  const partner = getPairPartner(activeChannel.value);
  return isCurrentPairLinked.value && ch === partner;
}

// --- Event handlers ---
async function handleAddFilter(type: BiquadFilterType) {
  await addFilterOfType(type);
  showAddFilterModal.value = false;
}

// --- Keyboard shortcuts ---
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (showAddFilterModal.value) {
      showAddFilterModal.value = false;
    } else if (showBackendInfoModal.value) {
      showBackendInfoModal.value = false;
    }
  }

  if (e.code === 'Space' && !showAddFilterModal.value && !showBackendInfoModal.value) {
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
  await initialize();
  await loadAppliedPreset();

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

        // A preset owns the bank: linking a pair would copy over its partner.
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
        flex: 1;
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

      .tab-pair-separator {
        width: 12px;
        flex-shrink: 0;

        // Reset border radius on adjacent tabs
        & + .tab { border-radius: 8px 0 0 8px; border-left: 1px solid #333; }
      }

      // The tab before a separator needs right border and radius
      .tab:has(+ .tab-pair-separator) {
        border-radius: 0 8px 8px 0;
        border-right: 1px solid #333;
      }
    }

    .channel-settings {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-top: 20px;
      padding: 16px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(112, 112, 112, 0.2);

      .setting-group {
        flex: 1;
        min-width: 140px;
        display: flex;
        flex-direction: column;
        align-items: center;

        label {
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      }

      .reset-group {
        flex: 0;
        min-width: auto;
      }

      .setting-control {
        display: flex;
        align-items: center;
        gap: 10px;

        .setting-value {
          font-size: 14px;
          font-weight: 500;
          min-width: 60px;
          text-align: center;
          color: var(--color-text);
        }

        &.stepper {
          .step-btn {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(112, 112, 112, 0.5);
            border-radius: 4px;
            padding: 8px;
            cursor: pointer;
            transition: all 0.2s ease;

            &:hover {
              background: rgba(225, 30, 74, 0.2);
              border-color: var(--primary, #e11e4a);
            }

            svg {
              width: 14px;
              height: 14px;
              fill: white;
            }
          }
        }
      }

      .toggle-btn {
        padding: 8px 16px;
        border: 1px solid rgba(112, 112, 112, 0.5);
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.1);
        color: var(--color-text);
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;

        &.active {
          background: var(--primary, #e11e4a);
          border-color: var(--primary, #e11e4a);
          color: white;
        }

        &:hover:not(.active) {
          background: rgba(225, 30, 74, 0.2);
          border-color: var(--primary, #e11e4a);
        }
      }

      .segmented-buttons {
        display: flex;
        gap: 0;

        button {
          padding: 8px 12px;
          border: 1px solid rgba(112, 112, 112, 0.5);
          background: rgba(255, 255, 255, 0.1);
          color: var(--color-text);
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;

          &:first-child { border-radius: 4px 0 0 4px; }
          &:last-child { border-radius: 0 4px 4px 0; }
          &:not(:last-child) { border-right: none; }

          &.active {
            background: var(--primary, #e11e4a);
            border-color: var(--primary, #e11e4a);
            color: white;
          }

          &:hover:not(.active) {
            background: rgba(225, 30, 74, 0.2);
            border-color: var(--primary, #e11e4a);
          }
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
