<template>
  <PageContent
  :title="`Crossover Design`"
  :backrouterLink="{ name: 'sound' }">
    <div class="main-container">
      <ContentBox>
        <div class="filtergraph-container">
          <div class="filtergraph-header">
            <h2>
              Channel {{ currentChannel }}
            </h2>
            <p>
              {{ backendName }}
            </p>
          </div>
          <FilterGraph
            :filters="currentFilterArray"
            :activeFilterId="activeFilterId"
            :showBandwidthLines="true"
            :sampleRate="48000"

            @set-active-filter="activeFilterId = $event"
            @update:freq-gain="onUpdateFreqGain"
            @update:q="onUpdateQ"
            @drag-start="onDragStart"
            @drag-end="onDragEnd"
          />
          <div class="filtergraph-channel-selector">
            <button
              :class="{ 'channel-selector-active': currentChannel === 'A' }"
              @click="currentChannel='A'">
              Channel A
            </button>
            <button
              :class="{ 'channel-selector-active': currentChannel === 'B' }"
              @click="currentChannel='B'">
              Channel B
            </button>
            <button
              :class="{ 'channel-selector-active': currentChannel === 'C' }"
              @click="currentChannel='C'">
              Channel C
            </button>
            <button
              :class="{ 'channel-selector-active': currentChannel === 'D' }"
              @click="currentChannel='D'">
              Channel D
            </button>
          </div>
        </div>
      </ContentBox>
      <CrossoverDesignFilterList
        :filterList="currentFilterArray"
        :currentChannel="currentChannel"
        v-model:activeFilterId="activeFilterId"
        @filter-removed="getFiltersFromFilterStore"
        />
      <ContentBox>
        <button @click="modalOpen = true">
          add filter
        </button>
      </ContentBox>
      <CrossoverDesignAddFilterModal v-model:open="modalOpen" :currentChannel="currentChannel" />
    </div>
  </PageContent>
</template>

<script setup lang="ts">
/* IMPORTS */
import { ref, computed, onMounted, watch } from 'vue'
import { type Filter } from '@/utils/filtercalc';
import { useFilterStore, type BackendCapabilities } from '@/stores/filter_connector';
import { convertStoreFilterToUI } from '@/utils/filter-conversions';
import PageContent from '@/components/PageContent.vue'
import ContentBox from '@/components/ContentBox.vue'
import FilterGraph from '@/components/FilterGraph.vue'
import CrossoverDesignAddFilterModal from
'@/components/crossover-design/CrossoverDesignAddFilterModal.vue';
import CrossoverDesignFilterList from
'@/components/crossover-design/CrossoverDesignFilterList.vue';


/* GLOBAL DEFINITIONS */
const activeFilterId = ref<number | null>(0)
const channelAFilters = ref<Filter[]>([]);
const channelBFilters = ref<Filter[]>([]);
const channelCFilters = ref<Filter[]>([]);
const channelDFilters = ref<Filter[]>([]);
const currentChannel = ref<string>("A");
const currentFilterArray = computed(() => {
  return getCurrentFilterArray();
});
const modalOpen = ref(false)

const filterStore = useFilterStore();
const backendCapabilities = ref<BackendCapabilities | null>(null);
const backendName = ref("");


/* FUNCTIONS */

/**
  * This function will be run after the component has been mounted.
  * Initialisations should be done here.
  */
onMounted(async () => {
  await filterStore.createMultipleFilterBanks(['A', 'B', 'C', 'D']);
  await loadBackendCapabilities();
  getFiltersFromFilterStore();
})

/**
  * Loads the backend capabilities using the `filterStore` and
  * stores it inside `const backendCapabilities`. The backend name
  * also gets saved into `const backendName`.
  */
const loadBackendCapabilities = async () => {
  try {
    backendCapabilities.value = await filterStore.getBackendCapabilities();
    backendName.value = backendCapabilities.value?.backendName || "";
    console.log("Backend capabilities loaded:", backendCapabilities.value);
  } catch (error) {
    console.error("Failed to load backend capabilities:", error);
  }
}

/**
  * Gets the filters for all the channels from the filterstore (backend),
  * converts them to ui-filters and loads them into the corresponding
  * filter array.
  */
function getFiltersFromFilterStore() {
  channelAFilters.value = filterStore.getFiltersFromBank('A').map((filter, index) =>
  convertStoreFilterToUI(filter, filter.id));

  channelBFilters.value = filterStore.getFiltersFromBank('B').map((filter, index) =>
  convertStoreFilterToUI(filter, filter.id));

  channelCFilters.value = filterStore.getFiltersFromBank('C').map((filter, index) =>
  convertStoreFilterToUI(filter, filter.id));

  channelDFilters.value = filterStore.getFiltersFromBank('D').map((filter, index) =>
  convertStoreFilterToUI(filter, filter.id));

  console.log("crossover-design: Filters loaded from the filterStore");
  console.log("crossover-design: channelAFilters: ", channelAFilters.value);

  activeFilterId.value = currentFilterArray.value.length-1;
}

/**
  * Returns the current filter array based on the `currentChannel` string.
  * @returns {Filter[]} the `channelXFilters.value` where `X` is the current channels letter.
  */
function getCurrentFilterArray(): Filter[] {
  switch (currentChannel.value) {
    case "A":
      return channelAFilters.value;
      break;
    case "B":
      return channelBFilters.value;
      break;
    case "C":
      return channelCFilters.value;
      break;
    case "D":
      return channelDFilters.value;
      break;

    default:
      return channelAFilters.value;
      break;
  }
}

/**
  * Watches for changes in the `openModal` ref.
  * When the value is changed, it reloads the filters from the
  * filterStore (the backend). This is done so after closing the
  * modal (after adding a filter), the ui gets updated.
  */
watch(modalOpen, async () => {
  getFiltersFromFilterStore();
})


/**
  * Helper function to get the backend position.
  * This is used to find the filter to update in the
  * backend while dragging the filter in the filtergraph.
  */
function findFilterPositionById(id: number): number {
  return currentFilterArray.value.findIndex(f => f.id === id);
}

/**
  * Updates a filter's frequency and gain in the global `filters`
  * array.
  *
  * @param {Object} payload
  * @param {number} payload.id - The unique identifier of the filter to edit.
  * @param {number} payload.frequency - The new frequency value (in Hz).
  * @param {number} payload.gain - The new gain value (in dB).
  */
const onUpdateFreqGain = async ({ id, frequency, gain }) => {
  const position = findFilterPositionById(id);
  if (position === -1) return;

  // Update backend
  await filterStore.updateFilter(currentChannel.value, position, {
    frequency,
    gain
  });

  // Optional: update UI immediately (optimistic)
  const target = currentFilterArray.value[position];
  target.frequency = frequency;
  target.gain = gain;
};


/**
  * Updates a filter's q in the global `filters` array.
  * @param {Object} payload
  * @param {number} payload.id
  * @param {number} payload.Q
  */
const onUpdateQ = async ({ id, Q }) => {
  const position = findFilterPositionById(id);
  if (position === -1) return;

  await filterStore.updateFilter(currentChannel.value, position, { Q });

  const target = currentFilterArray.value[position];
  target.Q = Q;
};


/**
  * Function that will be called when a filter is dragged.
  * @param {number} id
  */
const onDragStart = (id: number) => {
  console.log('drag start', id)
}

/**
  * Function that will be called when a filter is let go.
  * @param {number} id
  */
const onDragEnd = (id: number) => {
  console.log('drag end', id)
}
</script>

<style scoped>
button {
  padding: 10px;
  width: 100%;
}

.main-container {
  display: flex;
  flex-direction: column;
}

.filtergraph-container {
  padding: 10px;
}

.filtergraph-header {
  display: flex;
  width: 100%;
  justify-content: space-between;
  padding: 10px;
}

.filtergraph-channel-selector {
  display: flex;
  justify-content: space-between;
  margin: 10px;
  border: 1px solid var(--color-body);
  border-radius: 5px;
}

.filtergraph-channel-selector button:first-child {
  border-radius: 5px 0 0 5px;
}

.filtergraph-channel-selector button:last-child {
  border-radius: 0 5px 5px 0;
}

.channel-selector-active {
  background: var(--primary);
  color: var(--color-body);
  border-color: var(--primary);
}
</style>
