<template>
  <Teleport to="body">
    <div v-if="open" class="modal">
      <ContentBox>
        <button @click="close()">Close</button>
        <div class="modal-content">
          CrossoverDesignAddFilterModal
          <button @click="addFilter()">add filter</button>
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
import ContentBox from '@/components/ContentBox.vue'


/* PROPS */
const { open, currentChannel } = defineProps({
  open: Boolean,
  currentChannel: String
})


/* GLOBAL DEFINITIONS */
const emit = defineEmits(['update:open'])
const filterStore = useFilterStore();


/* FUNCTIONS */

/**
  * This function will be run when the "close" button is clicked.
  * It is not used anywhere else and is just here, so the code is
  * not directly inside of the button.
  */
function close() {
  emit('update:open', false)
}

async function addFilter() {
  const filter = {
    icon: 'peaking',
    frequency: 800,
    gain: 0,
    Q: 1.2,
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

