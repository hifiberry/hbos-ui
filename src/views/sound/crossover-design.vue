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
      </ContentBox>
    </div>
  </PageContent>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import PageContent from '@/components/PageContent.vue'
import ContentBox from '@/components/ContentBox.vue'
import FilterGraph from '@/components/FilterGraph.vue'


const activeFilterId = ref<number | null>(1)

const filters = ref([
  {
    id: 1,
    icon: 'peaking',
    text: 'Band 1',
    frequency: 1000,
    gain: 0,
    Q: 1.0,
    enabled: true
  },
  {
    id: 2,
    icon: 'peaking',
    text: 'Band 2',
    frequency: 5000,
    gain: -6,
    Q: 1.2,
    enabled: true
  }
])

const onUpdateFreqGain = ({ id, frequency, gain }) => {
  const target = filters.value.find(f => f.id === id)
  if (!target) return
  target.frequency = frequency
  target.gain = gain
}

const onUpdateQ = ({ id, Q }) => {
  const target = filters.value.find(f => f.id === id)
  if (!target) return
  target.Q = Q
}

const onDragStart = (id: number) => {
  console.log('drag start', id)
}

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
