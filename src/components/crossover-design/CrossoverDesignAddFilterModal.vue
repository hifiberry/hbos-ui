<template>
  <Teleport to="body">
    <div v-if="open" class="modal" @click="close()">
      <ContentBox>
        <div class="modal-content">
          <div class="modal-header">
            <h1>
              Add New Filter:
            </h1>
            <button @click="close()">
              <Icon icon="close" />
            </button>
          </div>
          <div class="modal-buttons-div">
            <button v-for="type in AVAILABLE_FILTER_TYPES" :key="type"
              class="modal-filter-type-button"
              @click="addFilter(type)">
              <Icon
                :icon="getFilterIconName(type)"
                height="40"
                width="40"
                />
              <p class="filter-name">
                {{ formatFilterTypeName(type) }}
              </p>
            </button>
          </div>
        </div>
      </ContentBox>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/* IMPORTS */
import { ref } from 'vue'
import { useAppConfigStore } from '@/stores/appconfig'
import { useFilterStore } from '@/stores/filter_connector';
import { type BiquadFilterType } from '@/utils/biquad';
import { getFilterIconName, formatFilterTypeName } from '@/utils/filter-display';
import Icon from '@/components/Icon.vue';
import ContentBox from '@/components/ContentBox.vue'



/* PROPS */
const { open, currentChannel } = defineProps({
  open: Boolean,
  currentChannel: String
})


/* GLOBAL DEFINITIONS */
const emit = defineEmits(['update:open'])
const filterStore = useFilterStore();
const AVAILABLE_FILTER_TYPES: BiquadFilterType[] = ['highpass', 'peaking', 'lowpass' ];


/* FUNCTIONS */

/**
  * This function will be run when the "close" button is clicked.
  * It is not used anywhere else and is just here, so the code is
  * not directly inside of the button.
  */
function close() {
  emit('update:open', false)
}

async function addFilter(type: BiquadFilterType) {
  const filter = {
    type: type,
    frequency: 800,
    gain: 0,
    q: 0.8,
    enabled: true
  };

  await filterStore.addFilter(currentChannel, 0, filter);

  close();
}
</script>

<style scoped lang="scss">
button {
  transition: all 0.25s;
  padding: 10px;

  border-radius: 8px;

  &:hover {
    background: rgba(225, 30, 74, 0.1);
  }
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: start;
  justify-content: center;
}

.modal-content > * {
  margin: 2%;
}

.modal-header {
  width: 98%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.filter-name {
  padding-top: 10px;
}

.modal-buttons-div {
  display: flex;
  flex-direction: row;
}

.modal-filter-type-button {
  color: var(--color-body);
  transition: all 0.25s;

  border: 2px solid var(--color-body);
  border-radius: 8px;
  padding-left: 20px;
  padding-right: 20px;
  margin: 10px;

  display: flex;
  flex-direction: column;
  align-items: center;

  &:hover {
    border: 2px solid var(--primary);
    background: rgba(225, 30, 74, 0.1);
  }
}
</style>

