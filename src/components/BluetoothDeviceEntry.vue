<template>
  <div class="bluetooth-device-entry-div">
    <div class="bluetooth-device-entry-info-div">
      <h3><u>{{ name }}</u></h3>
      <span :class="['status-badge', connected ? 'green' : 'gray']">
        {{ connected ? "Connected" : "Disconnected" }}
      </span>
    </div>
    <div class="bluetooth-device-entry-controls-div">
      <button @click="handleDisconnect"
        class="btn-action btn-disconnect">Unpair</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
import { useAppConfigStore } from '@/stores/appconfig'
import { useToastStore } from '@/stores/toast'

const configStore = useAppConfigStore()
const apiBaseUrl = configStore.getConfigApiBaseUrl()

const props = defineProps<{
  name: string
  address: string
  connected: boolean
  trusted: boolean
  onUpdate?: () => void
}>()

const handleDisconnect = async () => {
  const toastStore = useToastStore()
  try {
    const response = await fetch(
      `${apiBaseUrl}/bluetooth/unpair?address=${props.address}`,
      { method: "POST" }
    )

    const data = await response.json()

    if (response.ok) {
      toastStore.showSuccessToast(`Device ${props.address} unpaired successfully.`)
      props.onUpdate?.()
    } else {
      toastStore.showErrorToast(`Failed to unpair: ${data.error}`)
    }
  } catch (err) {
    toastStore.showErrorToast(`Failed to unpair: ${err}`)
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;

.bluetooth-device-entry-div {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  width: 100%;

  padding: 5px;
  margin: 5px;
  border: 2px solid var(--highlight-color-secondary);
  border-radius: 5px;
}

.bluetooth-device-entry-info-div {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
}
.bluetooth-device-entry-info-div>*{
  padding: 5px;
}

.bluetooth-device-entry-controls-div {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-end;
}

.btn-action {
  &.btn-connect {
    @include service-button-primary;
  }

  &.btn-disconnect {
    @include service-button-danger;
  }

  &.btn-cancel {
    @include service-button-secondary;
  }
}

</style>
