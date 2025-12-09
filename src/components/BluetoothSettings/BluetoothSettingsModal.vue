<script setup>
import { ref } from 'vue'
import ContentBox from '@/components/ContentBox.vue'
import { useAppConfigStore } from '@/stores/appconfig'

const configStore = useAppConfigStore()
const apiBaseUrl = configStore.getConfigApiBaseUrl()

const open = ref(false)
const passkey = ref("")

async function sendPasskey() {
  try {
    const response = await fetch(`${apiBaseUrl}/bluetooth/passkey`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        passkey: passkey.value,
      }),
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Failed to send passkey:", error)
  }
}
</script>

<template>
  <button @click="open = true">Open Modal</button>

  <Teleport to="body">
    <div v-if="open" class="modal">
      <ContentBox>
        <div class="modal-content">
          <h1>enter pincode</h1>

          <input
            v-model="passkey"
            type="text"
            maxlength="6"
            pattern="\d{6}"
            inputmode="numeric"
            placeholder="Enter 6 digits"
            @input="passkey = passkey.replace(/[^0-9]/g, '')"
          />

          <div class="modal-buttons-div">
            <button @click="open = false">Close</button>
            <button
              :disabled="passkey.length !== 6"
              @click="sendPasskey(); open = false"
            >
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

input {
  color: var(--color-body);
}

.modal-buttons-div {
  display: flex;
  flex-direction: row;
  width: 100%;
  justify-content: space-between;
}
</style>
