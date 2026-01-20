<template>
  <Teleport to="body">
    <div v-if="open" class="modal">
      <ContentBox>
        <button @click="close()">Close</button>
        <div class="modal-content">
          CrossoverDesignAddFilterModal
          <button v-for="type in AVAILABLE_FILTER_TYPES" :key="type"
            :class="['filter-type-option']"
            @click="addFilter(type)">
            <Icon :icon="getFilterIconName(type)" class="filter-icon" />
            <span class="filter-name">{{ formatFilterTypeName(type) }}</span>
          </button>
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
const AVAILABLE_FILTER_TYPES: BiquadFilterType[] = ['lowpass', 'peaking', 'highpass'];


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

<style>
button {
  color: var(--color-body);
  transition: all 0.25s;
}

button:disabled, button:disabled:hover {
  color: var(--color-body);
  opacity: 0.5;
  cursor: not-allowed;
}

button:hover {
  color: var(--primary);
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.modal-content > * {
  margin: 10px;
}

.modal-buttons-div {
  display: flex;
  flex-direction: row;
  width: 100%;
  justify-content: space-between;
}
</style>

