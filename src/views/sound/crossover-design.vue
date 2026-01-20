<template>
  <PageContent
  :title="`Crossover Design`"
  :backrouterLink="{ name: 'sound' }">
    <div class="main-container">
      <ContentBox>
        <div class="filtergraph-container">
          <div class="filtergraph-header">
            <h2>
              {{ currentChannel }}
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
              :class="{ 'channel-selector-active': currentChannel === 'Channel A' }"
              @click="currentChannel='Channel A'">
              Channel A
            </button>
            <button
              :class="{ 'channel-selector-active': currentChannel === 'Channel B' }"
              @click="currentChannel='Channel B'">
              Channel B
            </button>
            <button
              :class="{ 'channel-selector-active': currentChannel === 'Channel C' }"
              @click="currentChannel='Channel C'">
              Channel C
            </button>
            <button
              :class="{ 'channel-selector-active': currentChannel === 'Channel D' }"
              @click="currentChannel='Channel D'">
              Channel D
            </button>
          </div>
        </div>
      </ContentBox>
      <ContentBox>
        <button @click="addItemToFilters">
          add filter
        </button>
      </ContentBox>
    </div>
  </PageContent>
</template>

<script setup lang="ts">
/* IMPORTS */
import { ref, computed, onMounted } from 'vue'
import { type Filter } from '@/utils/filtercalc';
import { useFilterStore, type BackendCapabilities } from '@/stores/filter_connector';
import { convertStoreFilterToUI } from '@/utils/filter-conversions';
import PageContent from '@/components/PageContent.vue'
import ContentBox from '@/components/ContentBox.vue'
import FilterGraph from '@/components/FilterGraph.vue'


/* GLOBAL DEFINITIONS */
const activeFilterId = ref<number | null>(1)
const channelAFilters = ref<Filter[]>([]);
const channelBFilters = ref<Filter[]>([]);
const channelCFilters = ref<Filter[]>([]);
const channelDFilters = ref<Filter[]>([]);
const currentChannel = ref<string>("Channel A");
const currentFilterArray = computed(() => {
  return getCurrentFilterArray();
});

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

function getFiltersFromFilterStore() {
  channelAFilters.value = filterStore.getFiltersFromBank('A').map((filter, index) =>
  convertStoreFilterToUI(filter, `A_${index}`));
  console.log("crossover-design: Filters loaded from the filterStore");
  console.log("crossover-design: channelAFilters: ", channelAFilters.value);
}

/**
  * Returns the current filter array based on the `currentChannel` string.
  * @returns {Filter[]} the `channelXFilters.value` where `X` is the current channels letter.
  */
function getCurrentFilterArray(): Filter[] {
  switch (currentChannel.value) {
    case "Channel A":
      return channelAFilters.value;
      break;
    case "Channel B":
      return channelBFilters.value;
      break;
    case "Channel C":
      return channelCFilters.value;
      break;
    case "Channel D":
      return channelDFilters.value;
      break;

    default:
      return channelAFilters.value;
      break;
  }
}

/**
  * Adds a filter to the global `currentFilterArray` array.
  */
async function addItemToFilters() {
  const filter = {
    icon: 'peaking',
    frequency: 800,
    gain: 0,
    Q: 1.2,
    enabled: true
  };

  await filterStore.addFilter('A', 0, filter);

  getFiltersFromFilterStore();
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
const onUpdateFreqGain = ({ id, frequency, gain }) => {
  // Find the filter object that matches the supplied id.
  const target = currentFilterArray.value.find(f => f.id === id);

  // Return if no matching filter was found.
  if (!target) {
    return;
  }

  // Update the properties.
  target.frequency = frequency;
  target.gain = gain;
}

/**
  * Updates a filter's q in the global `filters` array.
  * @param {Object} payload
  * @param {number} payload.id
  * @param {number} payload.Q
  */
const onUpdateQ = ({ id, Q }) => {
  // Find the filter that matches the supplied id.
  const target = currentFilterArray.value.find(f => f.id === id);

  // Return if no matching filter was found
  if (!target) {
    return;
  }

  // Update the property.
  target.Q = Q;
}

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
