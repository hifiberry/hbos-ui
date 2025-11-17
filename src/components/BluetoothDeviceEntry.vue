<template>
  <div class="bluetooth-device-entry-div">
    <div class="bluetooth-device-entry-info-div">
      <h3>{{ name }}</h3>
      <span>{{ connected ? "Connected" : "Disconnected" }}</span>
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
  try {
    const response = await fetch(
      `${apiBaseUrl}/bluetooth/unpair?address=${props.address}`,
      { method: "POST" }
    )

    const data = await response.json()

    if (response.ok) {
      alert(`Device ${props.address} unpaired successfully.`)
      props.onUpdate?.()
    } else {
      alert(`Failed to unpair: ${data.error}`)
    }
  } catch (err) {
    alert(`Error: ${err}`)
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
  align-items: center;

  width: 100%;
}

.bluetooth-device-entry-controls-div {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  width: 100%;
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
