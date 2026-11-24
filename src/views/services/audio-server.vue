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
        <p v-if="chosen === 'aas' && running !== 'aas'" data-test="aas-not-running">
          aas is chosen but not running. If the device has not rebooted since, reboot; otherwise it may be restarting or
          have failed.
          <button v-if="aasSettingsError" class="btn btn-secondary btn-sm" :disabled="loading" data-test="aas-retry" @click="retry">
            Retry
          </button>
        </p>
        <div v-if="running !== chosen" class="reboot-pending">
          <p>The change applies after a reboot.</p>
          <button class="btn btn-primary btn-sm" @click="showRebootConfirmation = true">Reboot to apply</button>
        </div>
        <p v-if="warnings.length" class="server-warnings">
          <span v-for="w in warnings" :key="w">{{ w }}<br /></span>
        </p>
      </div>

      <div v-if="error" class="not-available">
        <p>Could not read the audio server: {{ error }}</p>
        <button class="btn btn-secondary btn-sm" :disabled="loading" @click="retry">Retry</button>
      </div>
      <p v-else-if="!available" class="not-available">
        aas is not installed on this device, so the audio server cannot be switched.
      </p>
      <div v-else class="backends-list">
        <div class="card" :class="{ active: chosen === 'pipewire' }">
          <h3>PipeWire</h3>
          <p>The default audio server.</p>
          <button
            class="btn btn-primary btn-sm"
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
            class="btn btn-primary btn-sm"
            :disabled="switching || chosen === 'aas'"
            @click="askSwitchToAas"
          >
            {{ chosen === 'aas' ? 'Chosen' : 'Use aas' }}
          </button>
        </div>
      </div>

      <div v-if="running === 'aas' && aasSettingsError" class="not-available" data-test="aas-not-answering">
        <p>aas is not answering right now; it may be restarting.</p>
        <button class="btn btn-secondary btn-sm" :disabled="loading" data-test="aas-retry" @click="retry">Retry</button>
      </div>

      <section v-if="aasShown && aasLoaded" class="aas-section" data-test="latency-section">
        <h3>Latency</h3>
        <p class="section-hint">
          The sound card's buffer. Lower is quicker to react, higher is safer against dropouts.
        </p>
        <p data-test="latency-saved">
          Saved: <strong>{{ savedLatencyLabel }}</strong>
        </p>
        <p v-if="savedLatencyError" class="server-warnings">
          Could not read the saved latency: {{ savedLatencyError }}
        </p>
        <p v-if="aasSettings" data-test="latency-running">
          aas runs at: <strong>{{ aasSettings.latency_ms }} ms</strong>
          <span v-if="runningLatencyDiffers"> (differs from the saved value)</span>
        </p>
        <div class="latency-row">
          <input
            v-model="latencyInput"
            type="number"
            min="1"
            max="100"
            step="1"
            class="latency-input"
            aria-label="Latency in ms"
            :placeholder="recommendedLatencyLabel"
            :disabled="latencyBusy"
            data-test="latency-input"
          />
          <span>ms</span>
          <button
            class="btn btn-primary btn-sm"
            :disabled="latencyBusy || typedLatency === null"
            data-test="latency-save"
            @click="askSaveLatency"
          >
            Save
          </button>
        </div>
        <p v-if="latencyNote" class="latency-note" :class="latencyNote.level" data-test="latency-note">
          {{ latencyNote.text }}
        </p>
        <p class="section-hint">Saving restarts aas: the sound stops for a moment.</p>
        <p v-if="latencyPending" data-test="latency-pending">Saved; it applies when aas next starts.</p>
        <p v-if="restarting" class="restarting" data-test="latency-restarting">
          Restarting… waiting for aas to come back.
        </p>
        <p v-if="latencyError" class="latency-note red" data-test="latency-error">{{ latencyError }}</p>
      </section>

      <section v-if="aasShown && aasLoaded" class="aas-section">
        <h3>Recommended for this board</h3>
        <p class="section-hint">
          Puts the latency back to this board's values.
        </p>
        <button
          class="btn btn-secondary"
          :disabled="latencyBusy"
          data-test="recommended"
          @click="showRecommendedConfirmation = true"
        >
          Recommended for this board
        </button>
      </section>
    </div>

    <ConfirmationDialog
      :is-open="showRecommendedConfirmation"
      title="Recommended for this board"
      :message="recommendedConfirmationMessage"
      confirm-button-text="Apply"
      cancel-button-text="Cancel"
      icon="tabler/adjustments"
      @close="showRecommendedConfirmation = false"
      @confirm="applyRecommended"
    />

    <ConfirmationDialog
      :is-open="showLatencyConfirmation"
      title="Low latency"
      :message="latencyConfirmationMessage"
      confirm-button-text="Save anyway"
      cancel-button-text="Cancel"
      :is-dangerous="true"
      icon="tabler/alert-circle"
      @close="showLatencyConfirmation = false"
      @confirm="confirmLowLatency"
    />

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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import PageContent from '@/components/PageContent.vue'
import ConfirmationDialog from '@/components/ConfirmationDialog.vue'
import { useToastStore } from '@/stores/toast'
import { useAudioServerStore } from '@/stores/audio-server'
import { useAasWarnings } from '@/composables/useAasWarnings'
import { rebootSystem } from '@/api/system'
import { getAasLatency, setAasLatency, type AudioServerName } from '@/api/audio-server'
import { getSettings, isAasError, type AasSettings, type ApiError } from '@/api/aas'
import { cardLatencyNote, validLatency } from '@/composables/useLatencyNotes'

const toastStore = useToastStore()
const store = useAudioServerStore()
const { running, chosen, available, error } = storeToRefs(store)
const { collectAasWarnings } = useAasWarnings()

const showAasConfirmation = ref(false)
const showRebootConfirmation = ref(false)
const pendingWarnings = ref<string[]>([])
const warnings = ref<string[]>([])
const switching = ref(false)
const loading = ref(false)

const reload = async () => {
  loading.value = true
  try {
    await store.load()
    if (aasShown.value) await loadLatency()
  } finally {
    loading.value = false
  }
}
const retry = reload
onMounted(reload)

/**
 * The aas sections show while aas runs or is chosen: a reload while aas
 * restarts finds it chosen, not running, and must not hide them.
 */
const aasShown = computed(() => chosen.value === 'aas' || running.value === 'aas')

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
    const { rebootRequired, warnings: reported } = await store.choose(server)
    warnings.value = reported.filter(Boolean)
    if (warnings.value.length) toastStore.showInfoToast(warnings.value.join(' '))
    if (rebootRequired) showRebootConfirmation.value = true
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

// --- Card latency: while aas runs or is chosen. ----------------------------
// The saved value is the config server's (it persists; null leaves it to
// aas's own default), the running one is aas's `GET /settings`. Saving goes
// through the config server only, so it works while aas does not answer.

/** aas restarts to apply a saved latency; it is polled this often, for this long. */
const RESTART_POLL_MS = 1000
const RESTART_WAIT_MS = 30_000
/** One poll gives up after this long, so a hanging request cannot hold up the wait. */
const RESTART_POLL_TIMEOUT_MS = 2000

const aasSettings = ref<AasSettings | null>(null)
/** aas's `GET /settings` failed: it is not answering, maybe restarting. */
const aasSettingsError = ref<string | null>(null)
/** Either aas answered or it is known not to: the sections can show. */
const aasLoaded = computed(() => aasSettings.value !== null || aasSettingsError.value !== null)
const savedLatency = ref<number | null>(null)
const savedLatencyError = ref<string | null>(null)
/** What the number input holds: a number, or '' when empty. */
const latencyInput = ref<number | string>('')
const latencySaving = ref(false)
const restarting = ref(false)
const latencyError = ref<string | null>(null)
/** Saved while aas was not running: it applies at aas's next start. */
const latencyPending = ref(false)
const showLatencyConfirmation = ref(false)
/** The value that opened the low-latency confirmation; that one is saved on confirm. */
const pendingLowLatency = ref<number | null>(null)
let restartPoll: ReturnType<typeof setTimeout> | null = null
/** Set when the page is left: a poll in flight then stops instead of scheduling the next. */
let unmounted = false

const loadLatency = async () => {
  const [settingsResult, savedResult] = await Promise.all([getSettings(), getAasLatency()])
  if (isAasError(settingsResult)) {
    aasSettings.value = null
    aasSettingsError.value = settingsResult.message
  } else {
    aasSettings.value = settingsResult
    aasSettingsError.value = null
  }
  if (isAasError(savedResult)) {
    savedLatencyError.value = savedResult.message
  } else {
    savedLatencyError.value = null
    savedLatency.value = savedResult.latency_ms
    latencyInput.value = savedResult.latency_ms ?? ''
  }
}

const recommendedLatencyLabel = computed(() => {
  const recommended = aasSettings.value?.latency_recommended_ms
  return recommended !== undefined ? `Recommended (${recommended} ms)` : "aas's default"
})

const latencyLabel = (ms: number | null) => (ms === null ? recommendedLatencyLabel.value : `${ms} ms`)

/** Not shown as a guess when the config server could not be read. */
const savedLatencyLabel = computed(() =>
  savedLatencyError.value !== null ? 'unknown' : latencyLabel(savedLatency.value),
)

/** The latency aas should run at: the saved one, or the recommended one for a saved `null`. */
const expectedLatency = (saved: number | null) => saved ?? aasSettings.value?.latency_recommended_ms

/** aas reports a float; the saved value is whole ms. */
const sameLatency = (a: number, b: number) => Math.abs(Number(a) - Number(b)) < 1e-6

const runningLatencyDiffers = computed(() => {
  if (savedLatencyError.value !== null || !aasSettings.value) return false
  const expected = expectedLatency(savedLatency.value)
  return expected !== undefined && !sameLatency(aasSettings.value.latency_ms, expected)
})

const typedLatency = computed(() => {
  const value = latencyInput.value
  if (typeof value === 'string' && value.trim() === '') return null
  return validLatency(typeof value === 'number' ? value : Number(value))
})

const latencyNote = computed(() =>
  typedLatency.value === null
    ? null
    : cardLatencyNote(
        typedLatency.value,
        aasSettings.value?.latency_recommended_ms,
        aasSettings.value?.latency_min_ms,
      ),
)

const latencyBusy = computed(() => latencySaving.value || restarting.value)

const latencyConfirmationMessage = computed(
  () =>
    `${pendingLowLatency.value} ms is below the lowest latency this board handles ` +
    `(${aasSettings.value?.latency_min_ms} ms): dropouts are likely.\n\n` +
    'Saving restarts aas: the sound stops for a moment.',
)

const stopRestartPoll = () => {
  if (restartPoll !== null) clearTimeout(restartPoll)
  restartPoll = null
}
onUnmounted(() => {
  unmounted = true
  stopRestartPoll()
})

/** `GET /settings`, or an error once `ms` have passed without an answer. */
const getSettingsWithin = async (ms: number) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<ApiError>((resolve) => {
    timer = setTimeout(() => resolve({ error: 'Timeout', message: 'aas did not answer in time' }), ms)
  })
  try {
    return await Promise.race([getSettings({ signal: AbortSignal.timeout(ms) }), timeout])
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Polls `GET /settings` until aas answers at the expected latency or the wait
 * runs out. The config server answers before aas has stopped, so an answer at
 * another value is the old aas still running. Without a recommended value to
 * expect for a saved `null`, any answer counts.
 */
const waitForAas = (saved: number | null) => {
  stopRestartPoll()
  restarting.value = true
  const expected = expectedLatency(saved)
  const deadline = Date.now() + RESTART_WAIT_MS
  let lastRunning: number | null = null
  const poll = async () => {
    restartPoll = null
    const result = await getSettingsWithin(RESTART_POLL_TIMEOUT_MS)
    if (unmounted) return
    if (!isAasError(result)) {
      lastRunning = result.latency_ms
      if (expected === undefined || sameLatency(result.latency_ms, expected)) {
        aasSettings.value = result
        aasSettingsError.value = null
        restarting.value = false
        return
      }
    }
    if (Date.now() >= deadline) {
      restarting.value = false
      latencyError.value =
        `aas did not come back within ${RESTART_WAIT_MS / 1000} s ` +
        `after the latency was saved as ${latencyLabel(saved)}` +
        (lastRunning !== null ? `; it still runs at ${lastRunning} ms` : '') +
        '. If it stays silent, set the latency back.'
    } else {
      restartPoll = setTimeout(poll, RESTART_POLL_MS)
    }
  }
  restartPoll = setTimeout(poll, RESTART_POLL_MS)
}

/**
 * Saves through the config server; `null` goes back to the board's default.
 * Resolves whether the save took.
 */
const saveLatency = async (latency: number | null): Promise<boolean> => {
  latencySaving.value = true
  latencyError.value = null
  latencyPending.value = false
  try {
    const result = await setAasLatency(latency)
    if (isAasError(result)) {
      toastStore.showErrorToast(`Could not save the latency: ${result.message}`)
      return false
    }
    savedLatency.value = result.latency_ms
    savedLatencyError.value = null
    latencyInput.value = result.latency_ms ?? ''
    if (result.restarted) waitForAas(result.latency_ms)
    else latencyPending.value = true
    return true
  } finally {
    latencySaving.value = false
  }
}

const askSaveLatency = () => {
  const latency = typedLatency.value
  if (latency === null) return
  const min = aasSettings.value?.latency_min_ms
  if (min !== undefined && latency < min) {
    pendingLowLatency.value = latency
    showLatencyConfirmation.value = true
    return
  }
  void saveLatency(latency)
}

const confirmLowLatency = async () => {
  showLatencyConfirmation.value = false
  const latency = pendingLowLatency.value
  pendingLowLatency.value = null
  if (latency !== null) await saveLatency(latency)
}

// --- Recommended for this board. -------------------------------------------
// A card latency that is already the default is not saved again, so aas does
// not restart.

const showRecommendedConfirmation = ref(false)

const recommendedConfirmationMessage = computed(() => {
  const restart =
    savedLatency.value === null && savedLatencyError.value === null
      ? ''
      : '\n\nSaving the latency restarts aas: the sound stops for a moment.'
  return `Sets the latency recommended for this board:\n\nLatency: ${recommendedLatencyLabel.value}${restart}`
})

/** A failed save reports itself; success is said also when nothing needed changing. */
const applyRecommended = async () => {
  showRecommendedConfirmation.value = false
  let ok = true
  if (savedLatency.value !== null || savedLatencyError.value !== null) ok = await saveLatency(null)
  if (ok) toastStore.showSuccessToast('Recommended latency set.')
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

    .btn {
      margin-top: 6px;
    }
  }

  .reboot-pending {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 10px 0;

    p {
      margin: 0;
    }
  }

  [data-test='aas-not-running'] .btn {
    margin-left: 8px;
  }

  .aas-section {
    margin-top: 30px;

    h3 {
      margin: 0 0 6px 0;
    }

    p {
      margin: 0 0 6px 0;
    }

    .section-hint {
      color: var(--color-body-secondary);
    }

    .latency-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 12px 0;
    }

    .latency-input {
      width: 15em;
    }

    // The fields as the Security page draws them.
    .latency-input {
      padding: 8px 10px;
      border: 1px solid rgba(128, 128, 128, 0.4);
      border-radius: 6px;
      background: var(--background-body, #fafafa);
      color: var(--color-body);
      font-size: 1rem;

      &:focus {
        outline: none;
        border-color: var(--primary);
      }

      &:disabled {
        opacity: 0.6;
      }
    }

    .latency-note.amber {
      color: var(--color-warning);
    }

    .latency-note.red {
      color: var(--color-error);
    }
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
