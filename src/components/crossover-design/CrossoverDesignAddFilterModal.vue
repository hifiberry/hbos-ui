<template>
  <Teleport to="body">
    <div v-if="open" class="modal">
      <ContentBox>
        <button @click="close()">Close</button>
        <div class="modal-content">
          CrossoverDesignAddFilterModal
        </div>
      </ContentBox>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/* IMPORTS */
import { ref } from 'vue'
import { useAppConfigStore } from '@/stores/appconfig'
import ContentBox from '@/components/ContentBox.vue'


/* PROPS */
const { open } = defineProps({
  open: { type: Boolean, required: true }
})


/* GLOBAL DEFINITIONS */
const emit = defineEmits(['update:open'])


/* FUNCTIONS */

/**
  * This function will be run when the "close" button is clicked.
  * It is not used anywhere else and is just here, so the code is
  * not directly inside of the button.
  */
function close() {
  emit('update:open', false)
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

