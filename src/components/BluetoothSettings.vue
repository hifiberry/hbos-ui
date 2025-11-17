<template>
  <ContentBox class="card-content">
    <h2>Settings</h2>
    <div class="bluetooth-settings-div">
      <div class="bluetooth-settings-pairs-div">
        <p>Discoverable</p>
        <select v-model="discoverableString" @change="updateSetting('discoverable', discoverableString)">
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>
    </div>
  </ContentBox>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import ContentBox from '@/components/ContentBox.vue'
import { useAppConfigStore } from '@/stores/appconfig'

const configStore = useAppConfigStore()
const apiBaseUrl = configStore.getConfigApiBaseUrl()

const capability = ref('')
const discoverable = ref(true)
const discoverableTimeout = ref(0)
const pairable = ref(true)
const pairableTimeout = ref(0)

// For easy v-model binding with string booleans
const discoverableString = computed({
  get: () => (discoverable.value ? 'true' : 'false'),
  set: (val) => (discoverable.value = val === 'true')
})
const pairableString = computed({
  get: () => (pairable.value ? 'true' : 'false'),
  set: (val) => (pairable.value = val === 'true')
})

onMounted(async () => {
  try {
    const response = await fetch(`${apiBaseUrl}/bluetooth/settings`)
    const data = await response.json()

    // All the settings are inside data.data
    capability.value = data.data.capability
    discoverable.value = data.data.discoverable
    discoverableTimeout.value = data.data.discoverableTimeout
    pairable.value = data.data.pairable
    pairableTimeout.value = data.data.pairableTimeout
  } catch (error) {
    console.error('Failed to fetch bluetooth config:', error)
  }
})

async function updateSetting(key: string, newValue: boolean | number) {
  try {
    const res = await fetch(`${apiBaseUrl}/bluetooth/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: newValue })
    })

    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`)
    }

    console.log(`${key} updated: ${newValue}`)
  } catch (error) {
    console.error(`Failed to update ${key}:`, error)
    alert(`Failed to update ${key} on server.`)
  }
}
</script>

<style scoped lang="scss">
.card-content {
  padding: 20px;
}

.bluetooth-settings-pairs-div {
  display: grid;
  width: 100%;
  grid-template-columns: 1fr 1fr;
  justify-items: center;
}
.bluetooth-settings-pairs-div p:nth-child(odd) {
  font-weight: bold;
}
@media (max-width: 600px) {
  .bluetooth-settings-pairs-div {
    display: flex;
    flex-direction: column;
    width: 100%;
    justify-items: center;
  }
}
</style>
