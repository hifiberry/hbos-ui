<script setup>
import { ref } from 'vue'
import ContentBox from '@/components/ContentBox.vue'
import { useAppConfigStore } from '@/stores/appconfig'

const configStore = useAppConfigStore()
const apiBaseUrl = configStore.getConfigApiBaseUrl()

const props = defineProps({
  open: { type: Boolean, required: true }
})

const emit = defineEmits(['update:open'])

const passkey = ref("")

function close() {
  emit('update:open', false)
}

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

<template>
  <Teleport to="body">
    <div v-if="open" class="modal">
      <ContentBox>
        <div class="modal-content">
          <h1>enter pincode</h1>

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

<style>
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content > * {
  margin: 10px;
}
.modal-content {
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.modal-buttons-div {
  display: flex;
  flex-direction: row;
  width: 100%;
  justify-content: space-between;
}
</style>
