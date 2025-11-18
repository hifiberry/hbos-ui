<template>
  <ContentBox class="card-content">
    <h2>Settings</h2>
    <div class="bluetooth-settings-div">
      <div class="bluetooth-settings-pairs-div">
        <p>Discoverable</p>
        <label class="toggle-switch">
          <input
            type="checkbox"
            :checked="discoverable"
            @change="updateSetting('discoverable', !discoverable)"
          >
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  </ContentBox>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ContentBox from '@/components/ContentBox.vue'
import { useAppConfigStore } from '@/stores/appconfig'

const configStore = useAppConfigStore()
const apiBaseUrl = configStore.getConfigApiBaseUrl()

const capability = ref('')
const discoverable = ref(true)
const discoverableTimeout = ref(0)
const pairable = ref(true)
const pairableTimeout = ref(0)

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
        // Update local state after successful API call
        if (key === 'discoverable' && typeof newValue === 'boolean') {
          discoverable.value = newValue;
        }
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
  align-items: center;
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

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--color-body-secondary);
    transition: 0.3s;
    border-radius: 24px;

    &:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }
  }

  input:checked + .toggle-slider {
    background-color: var(--primary);
  }

  input:checked + .toggle-slider:before {
    transform: translateX(20px);
  }

  input:focus + .toggle-slider {
    box-shadow: 0 0 1px var(--primary);
  }
}
</style>
