<template>
  <Teleport to="body">
    <div v-if="open" class="modal">
      <ContentBox>
        <div class="modal-content">
          <h1>Enter Pincode</h1>

          <input
            v-model="passkey"
            maxlength="6"
            inputmode="numeric"
            @input="passkey = passkey.replace(/[^0-9]/g, '')"
          />

          <div class="modal-buttons-div">
            <button @click="close()">Close</button>
            <button :disabled="passkey.length !== 6" @click="sendPasskey()">
              Enter
            </button>
          </div>
        </div>
      </ContentBox>
    </div>
  </Teleport>
</template>

<script setup>
/* IMPORTS */
import { ref } from 'vue'
import { useAppConfigStore } from '@/stores/appconfig'
import ContentBox from '@/components/ContentBox.vue'

/* PROPS */
const props = defineProps({
  open: { type: Boolean, required: true }
})

/* GLOBAL DEFINITIONS */
const configStore = useAppConfigStore()
const apiBaseUrl = configStore.getConfigApiBaseUrl()
const emit = defineEmits(['update:open'])
const passkey = ref("")

/* FUNCTIONS */

/**
  * This function will be run when the "close" button is clicked.
  * It is not used anywhere else and is just here, so the code is
  * not directly inside of the button.
  */
function close() {
  emit('update:open', false)
}

/**
  * Sends the passkey to the config-server.
  * This function is called when the "send" button is pressed.
  */
async function sendPasskey() {
  try {
    const response = await fetch(`${apiBaseUrl}/bluetooth/passkey`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passkey: passkey.value })
    })

    await response.json()
    emit('update:open', false)
  } catch (error) {
    console.error("Failed to send passkey:", error)
  }
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
