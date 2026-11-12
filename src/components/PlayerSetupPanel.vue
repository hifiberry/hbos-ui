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

      <template v-else-if="status.sign_in">
        <template v-if="status.logged_in">
          <p class="setup-line" data-test="signin-account">
            Signed in as {{ status.sign_in.account ?? 'unknown' }}<template v-if="status.sign_in.server_name"> on {{ status.sign_in.server_name }}</template>.
          </p>
          <StatusBlock v-if="signInError" variant="error">{{ signInError }}</StatusBlock>
          <div class="setup-actions">
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              data-test="signin-logout"
              :disabled="signInBusy"
              @click="logout"
            >
              Sign out
            </button>
          </div>
        </template>

        <template v-else-if="signInCode">
          <p class="setup-code" data-test="signin-code">{{ signInCode }}</p>
          <p class="setup-line" data-test="signin-instruction">
            Open the app, go to your profile &gt; Quick Connect, and enter this
            code.
          </p>
          <div class="setup-actions">
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              data-test="signin-cancel"
              @click="cancelPending"
            >
              Cancel
            </button>
          </div>
        </template>

        <template v-else>
          <p v-if="!status.sign_in.ready" class="setup-line setup-todo" data-test="signin-not-ready">
            {{ status.sign_in.reason ?? `${playerName} cannot sign in yet.` }}
          </p>
          <p v-else class="setup-line" data-test="signin-needed">
            Not signed in yet.
          </p>
          <StatusBlock v-if="signInError" variant="error">{{ signInError }}</StatusBlock>
          <div v-if="status.sign_in.ready" class="setup-actions">
            <button
              type="button"
              class="btn btn-primary btn-sm"
              data-test="signin-start"
              :disabled="signInBusy"
              @click="beginSignIn"
            >
              Sign in
            </button>
          </div>
        </template>
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
import { computed, onUnmounted, ref } from 'vue'
import StatusBlock from '@/components/StatusBlock.vue'
import {
  cancelSignIn,
  getSetupInstallState,
  getSignInState,
  signOut,
  startSetupInstall,
  startSignIn,
  type PlayerSetupStatus,
} from '@/api/player-setup'
import { formatSetupVersion } from '@/utils/setup-version'

const props = defineProps<{
  /** Status owned by the card, so collapsed and expanded agree and only one
   *  request is made. null while it has not been fetched yet. */
  status: PlayerSetupStatus | null
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

const emit = defineEmits<{ changed: [] }>()

const status = computed(() => props.status)
const loading = computed(() => props.status === null)
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

/** The card owns the status, so ask it to re-read rather than duplicating it. */
function refresh() {
  emit('changed')
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
      refresh()
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

const signInCode = ref<string | null>(null)
const signInError = ref<string | null>(null)
const signInBusy = ref(false)

async function pollSignIn() {
  try {
    const state = await getSignInState(props.baseUrl)
    if (state.state === 'waiting') {
      timer = setTimeout(pollSignIn, POLL_MS)
      return
    }
    signInCode.value = null
    if (state.state === 'approved') {
      refresh()
    } else if (state.state === 'expired' || state.state === 'failed') {
      signInError.value =
        state.error ?? (state.state === 'expired' ? 'The code expired.' : 'Sign-in failed.')
    }
  } catch (e) {
    signInCode.value = null
    signInError.value = message(e)
  }
}

async function beginSignIn() {
  stop()
  signInBusy.value = true
  signInError.value = null
  try {
    const { code } = await startSignIn(props.baseUrl)
    signInCode.value = code
    timer = setTimeout(pollSignIn, POLL_MS)
  } catch (e) {
    signInError.value = message(e)
  } finally {
    signInBusy.value = false
  }
}

async function cancelPending() {
  stop()
  signInCode.value = null
  try {
    await cancelSignIn(props.baseUrl)
  } catch (e) {
    signInError.value = message(e)
  }
}

async function logout() {
  signInBusy.value = true
  signInError.value = null
  try {
    await signOut(props.baseUrl)
    refresh()
  } catch (e) {
    signInError.value = message(e)
  } finally {
    signInBusy.value = false
  }
}

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

.setup-code {
  margin: 0;
  font-size: 2em;
  font-weight: 700;
  letter-spacing: 0.15em;
  font-variant-numeric: tabular-nums;
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
