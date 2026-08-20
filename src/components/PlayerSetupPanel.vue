<template>
  <div class="player-setup" data-test="player-setup">
    <p v-if="loading" class="setup-line">Checking {{ playerName }}&hellip;</p>

    <StatusBlock v-else-if="loadError" variant="error">{{ loadError }}</StatusBlock>

    <template v-else-if="status">
      <!-- The state a fresh install lands in: the package is on, but Spotify's
           binary is not, and only the user can ask for it to be fetched. -->
      <template v-if="!status.binary_installed">
        <p class="setup-line" data-test="setup-missing">
          {{ playerName }} is not installed yet. Its player cannot be
          redistributed with HiFiBerryOS, so it is downloaded onto this device
          on request.
        </p>
        <StatusBlock v-if="installError" variant="error">{{ installError }}</StatusBlock>
        <div class="setup-actions">
          <button
            type="button"
            class="btn btn-primary btn-sm"
            data-test="setup-download"
            :disabled="installing"
            @click="download"
          >
            {{ installing ? 'Downloading…' : `Download ${playerName}` }}
          </button>
        </div>
      </template>

      <template v-else>
        <p class="setup-line" data-test="setup-version" :title="status.version ?? ''">
          {{ playerName }} {{ shortVersion ?? '—' }}
          <span v-if="expiryLabel" class="setup-expiry">· {{ expiryLabel }}</span>
        </p>
        <p v-if="!credentialsSet" class="setup-line setup-todo" data-test="setup-needs-credentials">
          Fill in the settings below, then enable the player.
        </p>
        <p v-else-if="!status.logged_in" class="setup-line" data-test="setup-not-logged-in">
          Not signed in yet. Enable the player, then pick this device in the
          {{ playerName }} app.
        </p>
        <p v-else class="setup-line" data-test="setup-ready">
          Signed in{{ status.device_name ? ` as “${status.device_name}”` : '' }}.
        </p>
        <StatusBlock v-if="installError" variant="error">{{ installError }}</StatusBlock>
        <div class="setup-actions">
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            data-test="setup-update"
            :disabled="installing"
            @click="download"
          >
            {{ installing ? 'Updating…' : 'Update now' }}
          </button>
        </div>
      </template>

      <pre v-if="installLog" class="setup-log" data-test="setup-log">{{ installLog }}</pre>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import StatusBlock from '@/components/StatusBlock.vue'
import {
  getSetupInstallState,
  getSetupStatus,
  startSetupInstall,
  type PlayerSetupStatus,
} from '@/api/player-setup'
import { formatSetupVersion } from '@/utils/setup-version'

const props = defineProps<{
  /** From the player's descriptor: where its setup endpoints live. */
  baseUrl: string
  /** Player name, for copy that has to name it. */
  playerName: string
  /** Token the provider's binary prints before its version, if known. */
  binaryName?: string
  /** Whether every required credential setting already has a value. */
  credentialsSet: boolean
}>()
const credentialsSet = computed(() => props.credentialsSet)

const POLL_MS = 1500

const status = ref<PlayerSetupStatus | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const installing = ref(false)
const installError = ref<string | null>(null)
const installLog = ref('')

let timer: ReturnType<typeof setTimeout> | null = null

const stop = () => {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

// The line already names the player, and the build id, commit and platform
// the binary prints are noise at this size. Full string kept as the title.
const shortVersion = computed(() =>
  formatSetupVersion(status.value?.version, props.binaryName),
)

/** Builds stop working ~90 days after they are cut, so the date is the whole
 *  point of showing a version at all -- surface how close it is. */
const expiryLabel = computed(() => {
  const on = status.value?.expires_on
  if (!on) return null
  const days = Math.ceil((Date.parse(on) - Date.now()) / 86_400_000)
  if (Number.isNaN(days)) return null
  if (days < 0) return 'expired — update to keep playing'
  if (days === 0) return 'expires today'
  return `expires in ${days} day${days === 1 ? '' : 's'}`
})

async function refresh() {
  try {
    status.value = await getSetupStatus(props.baseUrl)
    loadError.value = null
  } catch (e) {
    loadError.value = message(e)
  } finally {
    loading.value = false
  }
}

async function pollInstall() {
  try {
    const state = await getSetupInstallState(props.baseUrl)
    installLog.value = state.output ?? ''
    if (!state.running) {
      installing.value = false
      // A non-zero exit is the only signal the fetch failed; the log is the
      // only place that says why, so keep it on screen rather than clearing it.
      if (state.returncode !== 0) {
        installError.value = `Download failed (exit code ${state.returncode}).`
      }
      await refresh()
      return
    }
  } catch (e) {
    installing.value = false
    installError.value = message(e)
    return
  }
  timer = setTimeout(pollInstall, POLL_MS)
}

async function download() {
  installing.value = true
  installError.value = null
  installLog.value = ''
  try {
    await startSetupInstall(props.baseUrl)
    timer = setTimeout(pollInstall, POLL_MS)
  } catch (e) {
    installing.value = false
    installError.value = message(e)
  }
}

onMounted(refresh)
onUnmounted(stop)
</script>

<style scoped lang="scss">
.player-setup {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.setup-line {
  margin: 0;
  font-size: 0.85em;
  color: var(--color-body-secondary);
}

.setup-todo {
  color: var(--primary);
  font-weight: 600;
}

.setup-expiry {
  opacity: 0.85;
}

.setup-actions {
  display: flex;
  gap: 8px;
}

.setup-log {
  max-height: 10rem;
  overflow: auto;
  margin: 0;
  padding: 8px;
  border-radius: 6px;
  background-color: var(--background-secondary);
  font-family: monospace;
  font-size: 0.75em;
  white-space: pre-wrap;
}
</style>
