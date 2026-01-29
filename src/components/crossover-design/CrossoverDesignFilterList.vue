<template>
  <ContentBox v-if="props.filterList.length !== 0">
    <div class="filter-list-container">
      <div
        v-for="(filter, index) in props.filterList"
        class="filter-list-entry"
        @click="emit('update:activeFilterId', filter.id)"
        :class="{ active: filter.id === activeFilterId }"
        >
        <!-- Icon, filtertype and remove button -->
        <div class="filter-list-entry-info">
          <Icon
            :icon="getFilterIconName(filter.icon)"
            width="40"
            height="40"
          />
          <h2>
            {{ filter.icon.toUpperCase() }}
          </h2>
          <button @click="removeFilter(index)">
            <Icon icon="close" />
          </button>
        </div>

        <!-- Descriptions -->
        <div class="filter-list-entry-info">
          <div class="filter-increment-decrement-info">
            FREQUENCY
          </div>
          <div class="filter-increment-decrement-info">
            GAIN
          </div>
          <div class="filter-increment-decrement-info">
            Q (WIDTH)
          </div>
        </div>

        <!-- Increment and decrement buttons -->
        <div class="filter-list-entry-info">
          <div class="filter-increment-decrement-buttons">
            <button @click="decrementFilterFrequency(index)">
              <Icon icon="minus-small" />
            </button>
            <p>
              {{ filter.frequency }} Hz
            </p>
            <button @click="incrementFilterFrequency(index)">
              <Icon icon="plus-small" />
            </button>
          </div>
          <div class="filter-increment-decrement-buttons">
            <button @click="decrementFilterGain(index)">
              <Icon icon="minus-small" />
            </button>
            <p>
              {{ filter.gain }} dB
            </p>
            <button @click="incrementFilterGain(index)">
              <Icon icon="plus-small" />
            </button>
          </div>
          <div class="filter-increment-decrement-buttons">
            <button @click="decrementFilterQ(index)">
              <Icon icon="minus-small" />
            </button>
            <p>
              {{ filter.Q.toFixed(2) }} Q
            </p>
            <button @click="incrementFilterQ(index)">
              <Icon icon="plus-small" />
            </button>
          </div>
        </div>
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
  (e: 'filters-updated'): void
}>()

/* GLOBAL DEFINITIONS */
const filterStore = useFilterStore();

/* FUNCTIONS */
/**
  * Removes a filter from the backend and tells the parent component,
  * that the filters have updated.
  * @param {number} index
  */
async function removeFilter(index) {
  await filterStore.removeFilter(props.currentChannel, index);
  emit('filters-updated');
}

/**
  * Decrements a filter's frequency in the backend and tells the parent
  * component, that the filters have updated.
  * @param {number} index
  */
async function decrementFilterFrequency(index) {
  if (index === -1) return;

  const filter = props.filterList[index];
  let frequency = (filter.frequency*0.95).toFixed(0);
  if (frequency < 20) {
    frequency = 20;
  }

  await filterStore.updateFilter(props.currentChannel, index, {
    frequency
  });

  emit('filters-updated');
}

/**
  * Increments a filter's frequency in the backend and tells the parent
  * component, that the filters have updated.
  * @param {number} index
  */
async function incrementFilterFrequency(index) {
  if (index === -1) return;

  const filter = props.filterList[index];
  let frequency = (filter.frequency*1.05).toFixed(0);
  if (frequency > 20000) {
    frequency = 20000;
  }

  await filterStore.updateFilter(props.currentChannel, index, {
    frequency
  });

  emit('filters-updated');
}

/**
  * Decrements a filter's gain in the backend and tells the parent
  * component, that the filters have updated.
  * @param {number} index
  */
async function decrementFilterGain(index) {
  if (index === -1) return;

  const filter = props.filterList[index];
  let gain = filter.gain-0.5;
  if (gain < -20) {
    gain = -20;
  }

  await filterStore.updateFilter(props.currentChannel, index, {
    gain
  });

  emit('filters-updated');
}

/**
  * Increments a filter's gain in the backend and tells the parent
  * component, that the filters have updated.
  * @param {number} index
  */
async function incrementFilterGain(index) {
  if (index === -1) return;

  const filter = props.filterList[index];
  let gain = filter.gain+0.5;
  if (gain > 20) {
    gain = 20;
  }

  await filterStore.updateFilter(props.currentChannel, index, {
    gain
  });

  emit('filters-updated');
}

/**
  * Decrements a filter's q in the backend and tells the parent
  * component, that the filters have updated.
  * @param {number} index
  */
async function decrementFilterQ(index) {
  if (index === -1) return;

  const filter = props.filterList[index];
  let q = filter.Q*0.95;
  if (q < 0.1) {
    q = 0.1;
  }

  await filterStore.updateFilter(props.currentChannel, index, { q });

  emit('filters-updated');
}

/**
  * Increments a filter's q in the backend and tells the parent
  * component, that the filters have updated.
  * @param {number} index
  */
async function incrementFilterQ(index) {
  if (index === -1) return;

  const filter = props.filterList[index];
  let q = filter.Q*1.05;
  if (q > 14.41) {
    q = 14.41;
  }

  await filterStore.updateFilter(props.currentChannel, index, { q });

  emit('filters-updated');
}
</script>

<style scoped lang="scss">
button {
  transition: all 0.25s;
  background: rgba(225, 255, 255, 0.1);
  border: 1px solid rgba(112, 112, 112, 0.5);
  border-radius: 8px;
  padding: 5px;
  margin: 10px;

  &:hover {
    border: 1px solid var(--primary);
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
  flex-direction: column;
  align-items: center;
  justify-content: space-between;

  &.active {
    border-color: var(--primary);
    background: rgba(225, 30, 74, 0.05);
  }

  &:hover {
    border: 1px solid #E11E4AAA;
    background: rgba(225, 30, 74, 0.02);
  }
}

.filter-list-entry-info {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-left: 25px;
  padding-right: 25px;

  width: 100%;
}

.filter-increment-decrement-buttons,
.filter-increment-decrement-info
{
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;

  /* tablet/mobile view */
  @media only screen and (max-width: 700px) {
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
    justify-content: center;
  }
}

.filter-increment-decrement-info {
  color: #666;
}
</style>
