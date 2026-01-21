<template>
  <ContentBox>
    <div class="filter-list-container">
      <template v-if="props.filterList.length === 0">
        <p>no filters in the current channel</p>
      </template>
      <p>
        activeFilterId: {{ activeFilterId }}
      </p>
      <div v-for="(filter, index) in props.filterList" class="filter-list-entry">
        <div class="filter-list-entry-info">
          <button @click="emit('update:activeFilterId', filter.id)">
            activate
          </button>
          <Icon :icon="getFilterIconName(filter.icon)" />
          <p>
            {{ filter.icon }} | {{ filter.frequency }} Hz | {{ filter.gain }} dB | Q {{ filter.Q.toFixed(2) }}
          </p>
        </div>
        <button @click="removeFilter(index)">
          <Icon icon="close" />
        </button>
      </div>
    </div>
  </ContentBox>
</template>

<script setup lang="ts">
/* IMPORTS */
import { type Filter } from '@/utils/filtercalc';
import { getFilterIconName } from '@/utils/filter-display';
import { useFilterStore } from '@/stores/filter_connector';
import ContentBox from '@/components/ContentBox.vue';
import Icon from '@/components/Icon.vue';

/* PROPS */
const props = defineProps<{
  filterList: Filter[];
  currentChannel: String;
  activeFilterId: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:activeFilterId', value: number | null): void
  (e: 'filterRemoved'): void
}>()

/* GLOBAL DEFINITIONS */
const filterStore = useFilterStore();

/* FUNCTIONS */
async function removeFilter(id) {
  await filterStore.removeFilter(props.currentChannel, id);
  emit('filterRemoved');
}

</script>

<style scoped lang="scss">
button {
  transition: all 0.25s;
  padding: 10px;

  border-radius: 8px;
  padding: 10px;
  margin: 10px;

  &:hover {
    background: rgba(225, 30, 74, 0.1);
  }
}

.filter-list-container {
  padding: 10px;
}

.filter-list-entry {
  transition: all 0.25s;

  border: 1px solid var(--color-body);
  border-radius: 8px;
  padding: 10px;
  margin: 10px;

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.filter-list-entry-info {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}
</style>
