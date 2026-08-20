<template>
  <div class="soloist-setup" data-test="soloist-setup">
    <p v-if="loading" class="soloist-line">Checking Soloist&hellip;</p>

    <StatusBlock v-else-if="loadError" variant="error">{{ loadError }}</StatusBlock>

    <template v-else-if="status">
      <!-- The state a fresh install lands in: the package is on, but Spotify's
           binary is not, and only the user can ask for it to be fetched. -->
      <template v-if="!status.binary_installed">
        <p class="soloist-line" data-test="soloist-missing">
          Soloist itself is not installed yet. HiFiBerry may not redistribute
          Spotify's player, so it is downloaded from Spotify onto this device.
        </p>
        <StatusBlock v-if="installError" variant="error">{{ installError }}</StatusBlock>
        <div class="soloist-actions">
          <button
            type="button"
            class="btn btn-primary btn-sm"
            data-test="soloist-download"
            :disabled="installing"
            @click="download"
          >
            {{ installing ? 'Downloading…' : 'Download Soloist from Spotify' }}
          </button>
        </div>
      </template>

      <template v-else>
        <p class="soloist-line" data-test="soloist-version" :title="status.version ?? ''">
          Soloist {{ shortVersion ?? '—' }}
          <span v-if="expiryLabel" class="soloist-expiry">· {{ expiryLabel }}</span>
        </p>
        <p v-if="!apiKeySet" class="soloist-line soloist-todo" data-test="soloist-needs-key">
          Enter your Soloist API key below, then enable the player.
        </p>
        <p v-else-if="!status.logged_in" class="soloist-line" data-test="soloist-not-logged-in">
          Not signed in to Spotify yet. Enable the player, then pick this device
          in the Spotify app.
        </p>
        <p v-else class="soloist-line" data-test="soloist-ready">
          Signed in{{ status.device_name ? ` as “${status.device_name}”` : '' }}.
        </p>
        <StatusBlock v-if="installError" variant="error">{{ installError }}</StatusBlock>
        <div class="soloist-actions">
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            data-test="soloist-update"
            :disabled="installing"
            @click="download"
          >
            {{ installing ? 'Updating…' : 'Update now' }}
          </button>
        </div>
      </template>

      <pre v-if="installLog" class="soloist-log" data-test="soloist-log">{{ installLog }}</pre>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import StatusBlock from '@/components/StatusBlock.vue'
import {
  getSoloistInstallState,
  getSoloistStatus,
  startSoloistInstall,
  type SoloistStatus,
} from '@/api/soloist'
import { formatSoloistVersion } from '@/utils/soloist-version'

const props = defineProps<{ apiKeySet: boolean }>()
const apiKeySet = computed(() => props.apiKeySet)

const POLL_MS = 1500

const status = ref<SoloistStatus | null>(null)
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

// The heading already says "Soloist", and the build id, commit and platform
// the binary prints are noise at this size. Full string kept as the title.
const shortVersion = computed(() => formatSoloistVersion(status.value?.version))

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
    status.value = await getSoloistStatus()
    loadError.value = null
  } catch (e) {
    loadError.value = message(e)
  } finally {
    loading.value = false
  }
}

async function pollInstall() {
  try {
    const state = await getSoloistInstallState()
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
    await startSoloistInstall()
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
.soloist-setup {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.soloist-line {
  margin: 0;
  font-size: 0.85em;
  color: var(--color-body-secondary);
}

.soloist-todo {
  color: var(--primary);
  font-weight: 600;
}

.soloist-expiry {
  opacity: 0.85;
}

.soloist-actions {
  display: flex;
  gap: 8px;
}

.soloist-log {
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
