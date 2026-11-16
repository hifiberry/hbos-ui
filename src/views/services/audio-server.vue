<template>
  <PageContent title="Audio Server" :backrouterLink="{ name: 'services' }">
    <div class="audio-server-content">
      <div class="audio-server-header">
        <h2>Audio Server</h2>
        <p>Choose which audio server runs on this device: PipeWire or aas.</p>
      </div>

      <div class="status-card">
        <p>
          Running: <strong>{{ label(running) }}</strong>
        </p>
        <p>
          Chosen for the next boot: <strong>{{ label(chosen) }}</strong>
        </p>
        <div v-if="running !== chosen" class="reboot-pending">
          <p>The change applies after a reboot.</p>
          <button class="action-button" @click="showRebootConfirmation = true">Reboot to apply</button>
        </div>
        <p v-if="warnings.length" class="server-warnings">
          <span v-for="w in warnings" :key="w">{{ w }}<br /></span>
        </p>
      </div>

      <p v-if="!available" class="not-available">
        aas is not installed on this device, so the audio server cannot be switched.
      </p>
      <div v-else class="backends-list">
        <div class="card" :class="{ active: chosen === 'pipewire' }">
          <h3>PipeWire</h3>
          <p>The default audio server.</p>
          <button
            class="action-button"
            :disabled="switching || chosen === 'pipewire'"
            @click="switchToPipewire"
          >
            {{ chosen === 'pipewire' ? 'Chosen' : 'Use PipeWire' }}
          </button>
        </div>
        <div class="card" :class="{ active: chosen === 'aas' }">
          <h3>aas</h3>
          <p>The alternative audio server.</p>
          <button
            class="action-button"
            :disabled="switching || chosen === 'aas'"
            @click="askSwitchToAas"
          >
            {{ chosen === 'aas' ? 'Chosen' : 'Use aas' }}
          </button>
        </div>
      </div>
    </div>

    <ConfirmationDialog
      :is-open="showAasConfirmation"
      title="Switch to aas"
      :message="aasConfirmationMessage"
      confirm-button-text="Switch to aas"
      cancel-button-text="Cancel"
      :is-dangerous="pendingWarnings.length > 0"
      icon="tabler/server"
      @close="showAasConfirmation = false"
      @confirm="confirmAas"
    />

    <ConfirmationDialog
      :is-open="showRebootConfirmation"
      title="Reboot Required"
      message="The audio server change takes effect after a reboot.

Would you like to reboot now?"
      confirm-button-text="Reboot Now"
      cancel-button-text="Reboot Later"
      :is-dangerous="true"
      icon="tabler/refresh"
      @close="showRebootConfirmation = false"
      @confirm="executeReboot"
    />
  </PageContent>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import PageContent from '@/components/PageContent.vue'
import ConfirmationDialog from '@/components/ConfirmationDialog.vue'
import { useToastStore } from '@/stores/toast'
import { useAudioServerStore } from '@/stores/audio-server'
import { useAasWarnings } from '@/composables/useAasWarnings'
import { rebootSystem } from '@/api/system'
import type { AudioServerName } from '@/api/audio-server'

const toastStore = useToastStore()
const store = useAudioServerStore()
const { running, chosen, available } = storeToRefs(store)
const { collectAasWarnings } = useAasWarnings()

const showAasConfirmation = ref(false)
const showRebootConfirmation = ref(false)
const pendingWarnings = ref<string[]>([])
const warnings = ref<string[]>([])
const switching = ref(false)

const label = (server: AudioServerName) => (server === 'aas' ? 'aas' : 'PipeWire')

const aasConfirmationMessage = computed(() =>
  pendingWarnings.value.length
    ? `Switching to aas stops the following from working on this device:\n\n${pendingWarnings.value
        .map((w) => `- ${w}`)
        .join('\n')}\n\nThe change applies after a reboot.`
    : 'Nothing that is in use on this device stops working. The change applies after a reboot.',
)

const askSwitchToAas = async () => {
  switching.value = true
  try {
    pendingWarnings.value = await collectAasWarnings()
    showAasConfirmation.value = true
  } finally {
    switching.value = false
  }
}

const choose = async (server: AudioServerName) => {
  switching.value = true
  try {
    const result = (await store.choose(server)) as unknown
    const data = (typeof result === 'object' && result !== null ? result : {}) as {
      reboot_required?: boolean
      warnings?: string[]
    }
    const reboot = typeof result === 'boolean' ? result : data.reboot_required !== false
    warnings.value = Array.isArray(data.warnings) ? data.warnings.filter(Boolean) : []
    if (warnings.value.length) toastStore.showInfoToast(warnings.value.join(' '))
    if (reboot) showRebootConfirmation.value = true
  } catch (err) {
    toastStore.showErrorToast(err instanceof Error ? err.message : 'Failed to switch the audio server')
  } finally {
    switching.value = false
  }
}

const confirmAas = async () => {
  showAasConfirmation.value = false
  await choose('aas')
}

const switchToPipewire = () => choose('pipewire')

const executeReboot = async () => {
  showRebootConfirmation.value = false
  try {
    toastStore.showInfoToast('Initiating system reboot...')
    await rebootSystem()
    toastStore.showSuccessToast('System reboot initiated. The system will restart shortly.')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred'
    toastStore.showErrorToast(`Failed to reboot system: ${message}. Please reboot manually using the system controls.`)
  }
}
</script>

<style scoped lang="scss">
.audio-server-content {
  .audio-server-header {
    margin-bottom: 30px;

    h2 {
      margin: 0 0 10px 0;
      font-size: 24px;
      color: var(--color-head);
    }

    p {
      margin: 0;
      color: var(--color-body-secondary);
    }
  }

  .status-card {
    margin-bottom: 20px;

    p {
      margin: 0 0 6px 0;
    }
  }

  .not-available {
    color: var(--color-body-secondary);
  }

  .backends-list {
    display: flex;
    flex-direction: column;
    gap: 15px;

    .card {
      background: var(--background-card);
      border-radius: 8px;
      border: 1px solid var(--color-border);
      padding: 16px;

      &.active {
        border-color: var(--primary);
      }

      h3 {
        margin: 0 0 6px 0;
      }

      p {
        margin: 0 0 12px 0;
        color: var(--color-body-secondary);
      }
    }
  }
}
</style>
