<template>
  <ContentBox class="card-content">
    <div class="bluetooth-settings-div">
      <h2>Bluetooth Settings</h2>

      <div class="bluetooth-settings-pairs-div">
        <p>Bluetooth agent capability</p>
        <select v-model="capability" @change="updateSetting('capability', capability)">
          <option value="DisplayOnly">DisplayOnly</option>
          <option value="DisplayYesNo">DisplayYesNo</option>
          <option value="KeyboardDisplay">KeyboardDisplay</option>
          <option value="KeyboardOnly">KeyboardOnly</option>
          <option value="NoInputNoOutput">NoInputNoOutput</option>
        </select>

        <p>Discoverable</p>
        <select v-model="discoverableString" @change="updateSetting('discoverable', discoverableString)">
          <option value="true">true</option>
          <option value="false">false</option>
        </select>

        <p>Discoverable timeout</p>
        <input
          type="number"
          min="0"
          v-model.number="discoverableTimeout"
          @change="updateSetting('discoverable_timeout', discoverableTimeout)"
        />

        <p>Pairable</p>
        <select v-model="pairableString" @change="updateSetting('pairable', pairableString)">
          <option value="true">true</option>
          <option value="false">false</option>
        </select>

        <p>Pairable timeout</p>
        <input
          type="number"
          min="0"
          v-model.number="pairableTimeout"
          @change="updateSetting('pairable_timeout', pairableTimeout)"
        />
      </div>
    </div>
  </ContentBox>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import ContentBox from '@/components/ContentBox.vue'

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
    const response = await fetch('/bluetooth/settings')
    const data = await response.json()
    capability.value = data.capability
    discoverable.value = data.discoverable
    discoverableTimeout.value = data.discoverableTimeout
    pairable.value = data.pairable
    pairableTimeout.value = data.pairableTimeout
  } catch (error) {
    console.error('Failed to fetch bluetooth config:', error)
  }
})

async function updateSetting(key: string, newValue: string | number) {
  try {
    const res = await fetch(`/bluetooth/settings/?${key}=${encodeURIComponent(newValue)}`, {
      method: 'POST'
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

.bluetooth-settings-div {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bluetooth-settings-pairs-div {
  display: flex;
  flex-direction: column;
  gap: 8px;

  select,
  input {
    max-width: 200px;
  }
}
</style>
