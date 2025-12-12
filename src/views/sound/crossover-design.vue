<template>
  <PageContent
  :title="`Crossover Design`"
  :backrouterLink="{ name: 'sound' }">
    <div class="main-container">
      <ContentBox>
        <FilterGraph
          :filters="filters"
          :activeFilterId="activeFilterId"
          :showBandwidthLines="true"
          :sampleRate="48000"

          @set-active-filter="activeFilterId = $event"
          @update:freq-gain="onUpdateFreqGain"
          @update:q="onUpdateQ"
          @drag-start="onDragStart"
          @drag-end="onDragEnd"
        />
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
import { ref } from 'vue'
import PageContent from '@/components/PageContent.vue'
import ContentBox from '@/components/ContentBox.vue'
import FilterGraph from '@/components/FilterGraph.vue'


/* GLOBAL DEFINITIONS */
const activeFilterId = ref<number | null>(1)
const filters = ref([
])


/* FUNCTIONS */

/**
  * Adds a filter to the global `filters` array.
  */
function addItemToFilters() {
  // Get current filter length so the id can be calculated later on
  const filterLength = filters.value.length;

  filters.value.push({
    id: filterLength+1,
    icon: 'peaking',
    text: 'Band ' + filterLength+1,
    frequency: 800,
    gain: 0,
    Q: 1.2,
    enabled: true
  });
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
  const target = filters.value.find(f => f.id === id);

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
  const target = filters.value.find(f => f.id === id);

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
.main-container {
  display: flex;
  flex-direction: column;
}
</style>
