<template>
  <ContentBox>
    <div class="filter-list-container">
      <template v-if="props.filterList.length === 0">
        <p>no filters in the current channel</p>
      </template>
      <div v-for="(filter, index) in props.filterList" class="filter-list-entry">
        <div class="filter-list-entry-info">
          <p>
            position: {{ index }}
          </p>
          <Icon :icon="getFilterIconName(filter.icon)" />
          <p>
            {{ filter.icon }}
          </p>
        </div>
        <button @click="removeFilter(index)">
          remove
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
}>();

const emit = defineEmits(['filterRemoved']);

/* GLOBAL DEFINITIONS */
const filterStore = useFilterStore();

/* FUNCTIONS */
async function removeFilter(id) {
  await filterStore.removeFilter(props.currentChannel, id);
  emit('filterRemoved');
}

</script>

<style>
.filter-list-container {
  padding: 10px;
}

.filter-list-entry {
  transition: all 0.25s;

  border: 2px solid var(--color-body);
  border-radius: 8px;
  padding: 10px;
  margin: 10px;

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;

  &:hover {
    border: 2px solid var(--primary);
    background: rgba(225, 30, 74, 0.1);
  }
}

.filter-list-entry-info {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}
</style>
