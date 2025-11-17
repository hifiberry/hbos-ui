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
    // Convert booleans to lowercase strings for Flask
    const valueString = typeof newValue === "boolean" ? String(newValue).toLowerCase() : newValue;

    // Build query string
    const url = `${apiBaseUrl}/bluetooth/settings?${key}=${valueString}`;

    try {
        const response = await fetch(url, {
            method: "POST",
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Update successful:", data);
        return data;
    } catch (error) {
        console.error("Failed to update setting:", error);
        throw error;
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
