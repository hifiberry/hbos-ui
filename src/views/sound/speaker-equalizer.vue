<template>
<PageContent
  :title="`Speaker Equalizer ${channelMode === 'both' ? 'Both' : (activeChannel === 'left' ? 'Left' : 'Right')}`"
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
          @click="toggleChannelMode"
          title="Channel Mode"
          :class="{ linked: channelMode === 'both' }"
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
        <Icon icon="tabler/armchair" @click="loadRoomEQSettings" title="Load Room EQ Configuration" class="icon-btn" />
        <Icon icon="folder_open" @click="loadEQSettings" title="Load EQ Settings" class="icon-btn" />
        <Icon icon="save" @click="saveEQSettings" title="Save EQ Settings" class="icon-btn" />
      </div>
    </div>
    <div class="card">
      <div class="graph">
        <FilterGraph
          :filters="filters"
          :active-filter-id="activeFilterId"
          :show-bandwidth-lines="true"
          :sample-rate="SAMPLE_RATE"
          @set-active-filter="activeFilterId = $event"
          @update:freq-gain="onGraphUpdateFreqGain"
          @update:q="onGraphUpdateQ"
          @drag-start="onGraphDragStart"
          @drag-end="onGraphDragEnd"
        />
      </div>
    </div>

    <div class="card mt-3">
      <div class="equaliser-panel">
        <div class="tabs">
          <button :class="['tab', { active: channelMode === 'both' || activeChannel === 'left' }]" @click="setActiveChannel('left')">
            Left
          </button>
          <button :class="['tab', { active: channelMode === 'both' || activeChannel === 'right' }]" @click="setActiveChannel('right')">
            Right
          </button>
        </div>

        <div class="filters">
          <div class="filter-header-wrapper">
          </div>
        </div>

        <div class="filters-list">
          <div v-for="filter in filters" :key="filter.id" class="card">
            <EqFilterItem
              :filter="filter"
              :is-active="activeFilterId === filter.id"
              @select="activeFilterId = $event"
              @remove="removeFilter"
              @toggle-enabled="toggleFilterEnabled"
              @increment-frequency="incrementFilterFrequency"
              @decrement-frequency="decrementFilterFrequency"
              @increment-gain="incrementFilterGain"
              @decrement-gain="decrementFilterGain"
              @widen-band="widenFilterBand"
              @narrow-band="narrowFilterBand"
              @update-generic-coeff="updateGenericCoeff"
            />
          </div>

          <div class="card">
            <div class="filter-item add-filter-item"
                 :class="{ disabled: !canAddFilterToCurrentChannel }"
                 @click="canAddFilterToCurrentChannel && (showAddFilterModal = true)">
              <div class="filter-main">
                <div class="filter-info">
                  <Icon icon="plus" class="filter-icon" />
                  <div class="filter-details">
                    <h3>{{ canAddFilterToCurrentChannel ? 'Add New Filter' : 'Maximum Filters Reached' }}</h3>
                    <div class="filter-frequency">
                      <span v-if="currentChannelFilterInfo">
                        {{ currentChannelFilterInfo.currentFilterCount }}/{{ currentChannelFilterInfo.maxFilters }} filters
                      </span>
                      <span v-else-if="canAddFilterToCurrentChannel">Click to add</span>
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
    @add="handleAddFilter"
  />

  <BackendInfoModal
    :open="showBackendInfoModal"
    :capabilities="backendCapabilities"
    @close="showBackendInfoModal = false"
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
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import Icon from '@/components/Icon.vue';
import PageContent from '@/components/PageContent.vue';
import FilterGraph from '@/components/FilterGraph.vue';
import EqFilterItem from '@/components/speaker-eq/EqFilterItem.vue';
import AddFilterModal from '@/components/speaker-eq/AddFilterModal.vue';
import BackendInfoModal from '@/components/speaker-eq/BackendInfoModal.vue';
import RoomEqLoaderModal, { type RoomEQConfigItem } from '@/components/speaker-eq/RoomEqLoaderModal.vue';

import { type BiquadFilterType } from '@/utils/biquad';
import { useEqFilters } from '@/composables/useEqFilters';
import { useBypass } from '@/composables/useBypass';
import { useEqFileIO } from '@/composables/useEqFileIO';
import { useRoomEQ } from '@/composables/useRoomEQ';

// Available filter types for the UI
const AVAILABLE_FILTER_TYPES: BiquadFilterType[] = ['lowshelf', 'peaking', 'highshelf', 'generic_normalized'];

// --- Composables ---
const {
  activeChannel,
  channelMode,
  leftFilters,
  rightFilters,
  activeFilterId,
  isDragging,
  backendCapabilities,
  backendName,
  filters,
  canAddFilterToCurrentChannel,
  currentChannelFilterInfo,
  initialize,
  loadBackendCapabilities,
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

const { isBypassed, startBypass, endBypass } = useBypass(activeChannel, channelMode, isDragging);

const { saveEQSettings, loadEQSettings } = useEqFileIO(
  leftFilters, rightFilters, activeChannel, channelMode, filters, activeFilterId
);

const {
  showRoomEQModal,
  loadingRoomEQConfigs,
  roomEQConfigs,
  loadRoomEQSettings,
  loadSelectedRoomEQConfig,
} = useRoomEQ(leftFilters, rightFilters, activeFilterId);

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

  // Check for Room EQ query parameters
  if (route.query.applyRoomEQ && route.query.channel) {
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
  document.body.style.userSelect = '';
});

// --- Watchers ---
watch([leftFilters, rightFilters], () => {
  leftFilters.value.forEach((f) => { f.text = `${f.frequency}`; });
  rightFilters.value.forEach((f) => { f.text = `${f.frequency}`; });
}, { deep: true });

watch(activeChannel, async () => {
  await loadBackendCapabilities();
});
</script>

<style scoped lang="scss">
@import '@/assets/scss/mixins.scss';

.sound-page {
  width: 100%;
  height: 100%;
}

.sound {
  padding: 20px;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .title-section {
      display: flex;
      flex-direction: column;
      gap: 5px;

      .backend-info {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #aaa;

        .backend-name {
          font-weight: 500;
          cursor: pointer;
          color: #00b8ff;
          text-decoration: underline;
          transition: color 0.2s ease;

          &:hover {
            color: #0096cc;
          }
        }

        .filter-limits {
          color: #00b8ff;
          font-weight: 500;
        }
      }
    }

    .header-actions {
      display: flex;
      gap: 20px;

      svg {
        cursor: pointer;
        width: 24px;
        height: 24px;
        transition: fill 0.2s ease;
        stroke: var(--color-icon);

        &.bypassed {
          stroke: blue;
        }
      }

      .icon-btn {
        cursor: pointer;
        width: 24px;
        height: 24px;
        transition: opacity 0.2s ease;

        &:hover {
          opacity: 0.5;
        }

        &.linked {
          stroke: red;
        }
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
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;

    svg {
      width: 100%;
      overflow: visible;
      user-select: none;

      .x-axis-labels,
      .y-axis-labels {
        font-family: 'Metropolis', sans-serif;
        font-weight: 400;
        font-size: 10px;
      }
    }
  }

  .equaliser-panel {
    .tabs {
      display: flex;
      flex-wrap: nowrap;

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

        &:first-child {
          border-radius: 8px 0 0 8px;
        }

        &:last-child {
          border-radius: 0 8px 8px 0;
          border-right: 1px solid #333;
        }

        &.active {
          background: #e11e4a;
          color: white;
          border-color: #e11e4a;
        }
      }
    }

    .filter-header-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      margin-top: 15px;
    }

    .filters-list {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 15px;

      .filter-item {
        padding: 20px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(112, 112, 112, 0.3);
        transition: all 0.2s ease-in-out;
        cursor: pointer;

        &.active {
          border-color: #e11e4a;
          background: rgba(225, 30, 74, 0.05);
        }

        &.add-filter-item {
          cursor: pointer;
          border-style: dashed;

          &:hover:not(.disabled) {
            border-color: #e11e4a;
            background: rgba(225, 30, 74, 0.05);
          }

          &.disabled {
            cursor: not-allowed;
            opacity: 0.5;
            border-color: #555;
            color: #777;

            .filter-icon {
              opacity: 0.5;
            }

            &:hover {
              border-color: #555;
              background: rgba(255, 255, 255, 0.02);
            }
          }
        }

        &:hover:not(.add-filter-item) {
          border-color: rgba(225, 30, 74, 0.5);
          background: rgba(225, 30, 74, 0.02);
        }

        .filter-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;

          .filter-info {
            display: flex;
            align-items: center;
            gap: 15px;

            .filter-icon {
              width: 32px;
              height: 32px;
            }

            .filter-details {
              h3 {
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
}

@media (max-width: 768px) {
  .sound {
    padding: 10px;

    .equaliser-panel {
      .tabs {
        flex-wrap: nowrap;
      }

      .tabs .tab {
        font-size: 16px;
        padding: 10px;
      }
    }
  }
}

@media (max-width: 480px) {
  .sound {
    .equaliser-panel {
      .tabs {
        flex-wrap: nowrap;
      }

      .tabs .tab {
        flex: 1 1 50%;
      }
    }
  }
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background-color: var(--background-card);
  padding: 30px;
  border-radius: 10px;
  width: max-content;
  min-width: 400px;
  max-width: 90vw;
  text-align: center;
  font-family: 'Metropolis', sans-serif;
  border: 1px solid #333;
  color: white;

  h2, p {
    font-size: 22px;
    margin-bottom: 15px;
    color: var(--color-text);
  }

  p {
    font-size: 16px;
    margin-bottom: 20px;
  }

  .filter-type-selector {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 15px;
    margin-bottom: 30px;

    .filter-type-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 15px 20px;
      border: 2px solid #ccc;
      border-radius: 8px;
      background-color: transparent;
      cursor: pointer;
      transition: all 0.3s ease;
      color: var(--color-text);
      min-width: 120px;
      max-width: 140px;

      .filter-icon {
        width: 40px;
        height: 40px;
        margin-bottom: 8px;
        transition: fill 0.3s ease;
      }

      .filter-name {
        font-size: 14px;
        font-weight: 500;
        text-transform: capitalize;
        white-space: pre-line;
        text-align: center;
        line-height: 1.2;
      }

      &.selected {
        background-color: #e11e4a;
        border-color: #e11e4a;
        color: white;

        .filter-icon {
          fill: white;
        }
      }

      &:hover {
        background-color: rgba(225, 30, 74, 0.1);
        border-color: #e11e4a;
      }
    }
  }
}

.backend-info-modal {
  width: 600px !important;
  max-width: 90% !important;
  text-align: left !important;

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #333;

    h2 {
      margin: 0;
      color: var(--color-head);
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      font-weight: bold;
      color: #666;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;

      &:hover {
        background-color: #f0f0f0;
        color: #000;
      }
    }
  }

  .modal-body {
    color: var(--color-text);
    line-height: 1.6;
  }
}

// Room EQ Modal Styles
.room-eq-modal {
  min-width: 500px !important;
  max-width: 700px !important;

  .modal-body {
    text-align: left;
  }

  .loading-message, .no-configs-message {
    text-align: center;
    padding: 2rem;
    color: #666;
  }

  .config-selection {
    margin-bottom: 1.5rem;

    h4 {
      margin-bottom: 1rem;
      color: #333;
    }

    .config-list {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #ddd;
      border-radius: 8px;
    }

    .config-item {
      padding: 1rem;
      border-bottom: 1px solid #eee;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background-color: #f8f9fa;
      }

      &.selected {
        background-color: #e3f2fd;
        border-color: #2196f3;
      }

      &:last-child {
        border-bottom: none;
      }

      .config-name {
        font-weight: 600;
        color: #333;
        margin-bottom: 0.25rem;
      }

      .config-details {
        font-size: 0.875rem;
        color: #666;
      }
    }
  }

  .channel-selection {
    margin-bottom: 1.5rem;

    h4 {
      margin-bottom: 1rem;
      color: #333;
    }

    .channel-options {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .channel-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      color: #333;

      input[type="radio"] {
        margin: 0;
      }
    }
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s;

      &.secondary {
        background: #6c757d;
        color: white;

        &:hover {
          background: #5a6268;
        }
      }

      &.primary {
        background: #007bff;
        color: white;

        &:hover:not(:disabled) {
          background: #0056b3;
        }

        &:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
      }
    }
  }
}
</style>
