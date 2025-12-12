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
      <div class="bluetooth-settings-pairs-div">
        <p>Pairing with password</p>
        <div class="toggle-container">
          <label class="toggle-switch">
            <input
              type="checkbox"
              :checked="capability === 'KeyboardOnly'"
              @change="togglePairingWithPassword"
            >
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      <BluetoothSettingsModal v-model:open="modalOpen" />
    </div>
  </ContentBox>
</template>

<script setup lang="ts">
/* IMPORTS */
import { ref, onMounted, onUnmounted } from 'vue'
import { useAppConfigStore } from '@/stores/appconfig'
const configStore = useAppConfigStore()
import ContentBox from '@/components/ContentBox.vue'
import BluetoothSettingsModal from '@/components/BluetoothSettings/BluetoothSettingsModal.vue'


/* GLOBAL DEFINITIONS */
const apiBaseUrl = configStore.getConfigApiBaseUrl()
const discoverable = ref(false)
const discoverableCountdown = ref(60)
const countdownInterval = ref<number | null>(null)
const isCountdownActive = ref(false)
const modalOpen = ref(false)
const modalShouldRequest = ref(false);
const capability = ref("KeyboardOnly")


/* FUNCTIONS */

/**
  * Callback function called after the component has been mounted.
  * This will get the bluetooth settings from the config-server
  * and adjust the values accordingly.
  */
onMounted(async () => {
  try {
    const response = await fetch(`${apiBaseUrl}/bluetooth/settings`)
    const data = await response.json()

    capability.value = data.data.capability
    discoverable.value = data.data.discoverable

    if (discoverable.value) {
      startCountdown()
    }

  } catch (error) {
    console.error('Failed to fetch bluetooth config:', error)
  }
})

/**
  * Callback function called after the component has been unmounted.
  * This will stop the interval from continuing after the component
  * is not visible anymore.
  */
onUnmounted(() => {
  if (countdownInterval.value) clearInterval(countdownInterval.value)
})

/**
  * Updates a setting in the hbos-bluetooth-service via the config-server.
  *
  * @param {string} key - The key of the setting.
  * @param {boolean | number} newValue - The new value that should be written into the config-server.
  * @throws Will throw an error if the http response status code is not `response.ok`.
  * @throws Will throw an error if it could not update the setting inside the config-server.
  */
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

/**
  * Starts the countdown inside the frontend. This will display
  * the countdown and also request the modal backend API each second.
  * If the time has ran out, it will close the modal and set the
  * discoverable value to false. This will also update the setting
  * inside the backend.
  */
function startCountdown() {
  isCountdownActive.value = true
  discoverableCountdown.value = 60
  updateSetting('discoverable_timeout', 60)
  modalShouldRequest.value = true;

  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }

  countdownInterval.value = window.setInterval(() => {
    if (discoverableCountdown.value > 0) {
      discoverableCountdown.value--
      if (modalShouldRequest.value == true) {
        showModalIfTrue();
      }
    } else {
      discoverable.value = false
      isCountdownActive.value = false
      updateSetting('discoverable', false)
      if (countdownInterval.value) {
        clearInterval(countdownInterval.value)
      }
      modalOpen.value = false
    }
  }, 1000)
}

/**
  * Request the backend modal API. Show the modal if it returns `"true"`.
  */
async function showModalIfTrue()
{
  try {
    const response = await fetch(`${apiBaseUrl}/bluetooth/modal`);
    const data = await response.json();

    console.log(data.modal);
    if (data.modal === "true") {
      modalOpen.value = true;
      modalShouldRequest.value = false;
    }
  } catch (error) {
    console.error("Failed to fetch bluetooth modal:", error);
  }
}

/**
  * Stops the countdown inside the frontend.
  */
function stopCountdown() {
  isCountdownActive.value = false
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }
}

/**
  * Toggles the discoverable mode (pairing mode).
  * If the pairing mode is set to false, it will
  * also stop the countdown using the
  * `stopCountdown()` function.
  */
async function toggleDiscoverable() {
  const newState = !discoverable.value

  try {
    await updateSetting('discoverable', newState)
    discoverable.value = newState

    if (newState) startCountdown()
    else stopCountdown()
  } catch (error) {
    console.error("Failed to toggle discoverable state:", error)
  }
}

/**
  * Update the capability (pairing with password)
  * in the backend. It can either be `"NoInputNoOutput"`
  * or `"KeyboardOnly"`.
  * `"KeyboardOnly"` is with the passkey and
  * `"NoInputNoOutput"` without the passkey.
  *
  * Please look at the [hbos-bluetooth-service](https://github.com/arcathrax/hbos-bluetooth-service)
  * for all the available options.
  */
async function togglePairingWithPassword() {
  try {
    if (capability.value === "NoInputNoOutput") {
      await updateSetting("capability", "KeyboardOnly")
      capability.value = "KeyboardOnly"
    } else {
      await updateSetting("capability", "NoInputNoOutput")
      capability.value = "NoInputNoOutput"
    }
  } catch (error) {
    console.log("Failed to toggle pairing with password:", error)
  }
}

/**
  * Resets the countdown. This is called
  * when the user presses on the visible countdown,
  * so it will go back to 60.
  *
  * This will simply update the ui and send the
  * setting to the backend.
  */
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
