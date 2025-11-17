<template>
  <ContentBox class="card-content">
    <h2>Devices</h2>
    <div class="bluetooth-devices-div">
      <p v-if="loading">Loading devices...</p>
      <p v-if="error" class="error">{{ error }}</p>

      <div v-if="!loading && !error" class="bluetooth-device-list">
        <template v-if="devices.length > 0">
          <BluetoothDeviceEntry
            v-for="device in devices"
            :key="device.address"
            :name="device.name"
            :address="device.address"
            :connected="device.connected"
            :trusted="device.trusted"
            :onUpdate="fetchDevices"
          />
        </template>
        <p v-else>No paired devices found.</p>
      </div>
    </div>
  </ContentBox>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAppConfigStore } from '@/stores/appconfig'
import BluetoothDeviceEntry from '@/components/BluetoothDeviceEntry.vue'
import ContentBox from '@/components/ContentBox.vue'

const configStore = useAppConfigStore()
const apiBaseUrl = configStore.getConfigApiBaseUrl()


interface BluetoothDevice {
  address: string
  connected: boolean
  name: string
  trusted: boolean
}

const devices = ref<BluetoothDevice[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const fetchDevices = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await fetch(`${apiBaseUrl}/bluetooth/paired-devices`)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const result = await response.json()
    console.log(result);
    const data: BluetoothDevice[] = result.data
    devices.value = data
  } catch (err) {
    console.error(err)
    error.value = 'Failed to load Bluetooth devices.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchDevices)
</script>

<style scoped lang="scss">
.card-content {
  padding: 20px;
}

.bluetooth-devices-div {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-items: center;
  align-items: center;
}

.bluetooth-device-list {
  width: 95%;
  display: flex;
  flex-direction: column;
  justify-items: center;
  align-items: center;
}

.error {
  color: red;
}
</style>
