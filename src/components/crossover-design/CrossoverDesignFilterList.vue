<template>
  <ContentBox v-if="props.filterList.length !== 0">
    <div class="filter-list-container">
      <div
        v-for="(filter, index) in props.filterList"
        :key="filter.id"
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
          <div class="filter-list-entry-controls">
            <div class="filter-toggle">
              <label class="toggle-switch">
                <input
                  type="checkbox"
                  :checked="filter.enabled"
                  @click.stop.prevent="toggleFilterBypassState(index)"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <button @click="removeFilter(index)">
              <Icon icon="close" />
            </button>
          </div>
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
import { useToastStore } from '@/stores/toast'
import { getFilterIconName } from '@/utils/filter-display';
import { useFilterStore } from '@/stores/filter_connector';
import { setIndividualFilterBypassState } from '@/api/dsptoolkit';
import ContentBox from '@/components/ContentBox.vue';
import Icon from '@/components/Icon.vue';

/* PROPS */
const props = defineProps<{
  filterList: Filter[];
  currentChannel: string;
  activeFilterId: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:activeFilterId', value: number | null): void
  (e: 'filters-updated'): void
}>()

/* GLOBAL DEFINITIONS */
const filterStore = useFilterStore();
const toastStore = useToastStore()

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

/**
  * Toggles the bypas state of a filter. Currently
  * only sets the filter to `bypassed=true`.
  */
async function toggleFilterBypassState(index: number) {
  const filter = props.filterList[index];
  if (!filter) return;

  const oldValue = filter.enabled;
  const newValue = !oldValue;

  // Optimistically update UI
  filter.enabled = newValue;

  try {
    await setIndividualFilterBypassState({
      bankAddress: props.currentChannel,
      filterOffset: index,
      bypassed: !newValue
    });

    emit('filters-updated');
  } catch (error) {
    console.error("CrossoverDesignFilterList: Failed to toggle filter", error);
    toastStore.showErrorToast('Failed to toggle filter.')

    filter.enabled = oldValue;
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;

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
  &.active {
    border: 1px solid var(--primary);
    background: rgba(225, 30, 74, 0.1);
  }
}

.toggle-switch {
  @include service-toggle-switch;
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

.filter-list-entry-controls {
  display: flex;
  justify-content: center;
  align-content: center;
}

.filter-toggle {
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    cursor: pointer;

    input {
      opacity: 0;
    }

    .toggle-slider {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #555;
      transition: 0.3s;
      border-radius: 24px;

      &:before {
        position: absolute;
        content: '';
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
      }
    }

    input:checked + .toggle-slider {
      background-color: #e11e4a;
    }

    input:checked + .toggle-slider:before {
      transform: translateX(20px);
    }
  }
}
</style>
