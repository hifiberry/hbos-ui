<template>
  <ContentBox class="card-content">
    <div class="bluetooth-settings-div">
      <div class="bluetooth-settings-pairs-div">
        <p>Enable pairing</p>
        <div class="toggle-container">
          <span
            v-if="discoverable && isCountdownActive"
            @click="resetCountdown"
            class="countdown"
            title="Click to reset timer"
          >
            {{ discoverableCountdown }}s
          </span>
          <label class="toggle-switch">
            <input
              type="checkbox"
              :checked="discoverable"
              @change="toggleDiscoverable"
            >
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      <BluetoothSettingsModal />
    </div>
  </ContentBox>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import ContentBox from '@/components/ContentBox.vue'
import BluetoothSettingsModal from '@/components/BluetoothSettings/BluetoothSettingsModal.vue'
import { useAppConfigStore } from '@/stores/appconfig'

const configStore = useAppConfigStore()
const apiBaseUrl = configStore.getConfigApiBaseUrl()

const discoverable = ref(false)
const discoverableCountdown = ref(60)
const countdownInterval = ref<number | null>(null)
const isCountdownActive = ref(false)

const capability = ref('')
const discoverableTimeout = ref(0)
const pairable = ref(true)
const pairableTimeout = ref(0)



onMounted(async () => {
  try {
    const response = await fetch(`${apiBaseUrl}/bluetooth/settings`)
    const data = await response.json()

    capability.value = data.data.capability
    discoverable.value = data.data.discoverable
    discoverableTimeout.value = data.data.discoverableTimeout
    pairable.value = data.data.pairable
    pairableTimeout.value = data.data.pairableTimeout

    if (discoverable.value) {
      startCountdown()
    }

  } catch (error) {
    console.error('Failed to fetch bluetooth config:', error)
  }
})

onUnmounted(() => {
  if (countdownInterval.value) clearInterval(countdownInterval.value)
})

async function updateSetting(key: string, newValue: boolean | number) {
  const valueString = typeof newValue === "boolean" ? String(newValue).toLowerCase() : newValue
  const url = `${apiBaseUrl}/bluetooth/settings?${key}=${valueString}`

  try {
    const response = await fetch(url, { method: "POST" })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const data = await response.json()
    console.log("Update successful:", data)
    return data
  } catch (error) {
    console.error("Failed to update setting:", error)
    throw error
  }
}

function startCountdown() {
  isCountdownActive.value = true
  discoverableCountdown.value = 60
  updateSetting('discoverable_timeout', 60)

  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }

  countdownInterval.value = window.setInterval(() => {
    if (discoverableCountdown.value > 0) {
      discoverableCountdown.value--
    } else {
      discoverable.value = false
      isCountdownActive.value = false
      updateSetting('discoverable', false)
      if (countdownInterval.value) {
        clearInterval(countdownInterval.value)
      }
    }
  }, 1000)
}

function stopCountdown() {
  isCountdownActive.value = false
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }
}

async function toggleDiscoverable() {
  const newState = !discoverable.value
  try {
    await updateSetting('discoverable', newState)
    discoverable.value = newState
    if (newState) {
      startCountdown()
    } else {
      stopCountdown()
    }
  } catch (error) {
    console.error("Failed to toggle discoverable state:", error)
  }
}

function resetCountdown() {
  discoverableCountdown.value = 60
  updateSetting('discoverable_timeout', 60)
}
</script>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;
.card-content {
  padding: 20px;
  @include service-item-base;
}

.bluetooth-settings-pairs-div {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 15px;
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

.toggle-container {
  display: flex;
  align-items: center;
  gap: 16px;
}

.countdown {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-body-secondary);
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: var(--primary);
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
