<template>
  <PageContent title="Security" :backrouterLink="{ name: 'services' }">
    <div class="security-content">
      <div class="info-card">
        <div class="card-header">
          <Icon icon="lock" class="card-icon" />
          <h2>Status</h2>
        </div>
        <p v-if="loading">Loading&hellip;</p>
        <template v-else>
          <p class="status-line">
            Protection: <strong>{{ protectionLabel }}</strong>
          </p>
          <p class="status-line">
            Password: <strong>{{ status?.has_password ? 'set' : 'not set' }}</strong>
          </p>
          <p class="status-line">
            This session: <strong>{{ status?.authenticated ? 'signed in' : 'not signed in' }}</strong>
            <button
              v-if="status?.authenticated"
              type="button"
              class="link-button"
              :disabled="busy"
              @click="onLogout"
            >
              Log out
            </button>
          </p>
        </template>
        <p v-if="loadError" class="security-error">{{ loadError }}</p>
      </div>

      <div class="info-card">
        <div class="card-header">
          <Icon icon="lock" class="card-icon" />
          <h2>{{ status?.has_password ? 'Change password' : 'Set a password' }}</h2>
        </div>
        <p>
          Music playback, volume and browsing your library never need a password &mdash; this
          protects settings changes only.
        </p>

        <form class="security-form" @submit.prevent="onSavePassword">
          <template v-if="status?.has_password">
            <label for="current-password">Current password</label>
            <input
              id="current-password"
              v-model="currentPassword"
              type="password"
              autocomplete="current-password"
              :disabled="busy"
            />
          </template>

          <label for="new-password">{{ status?.has_password ? 'New password' : 'Password' }}</label>
          <input
            id="new-password"
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            :disabled="busy"
          />

          <label for="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            :disabled="busy"
          />

          <label class="security-remember">
            <input v-model="remember" type="checkbox" :disabled="busy" />
            Remember on this device
          </label>

          <p v-if="passwordError" class="security-error">{{ passwordError }}</p>
          <p v-if="passwordSuccess" class="security-success">{{ passwordSuccess }}</p>

          <button type="submit" class="save-button" :disabled="busy || !canSavePassword">
            {{ status?.has_password ? 'Change password' : 'Set a password' }}
          </button>
        </form>
      </div>

      <div v-if="status?.has_password" class="info-card">
        <div class="card-header">
          <Icon icon="lock" class="card-icon" />
          <h2>Require password for</h2>
        </div>

        <div class="policy-options">
          <label class="policy-option">
            <input
              type="radio"
              name="protection-policy"
              value="risky"
              :checked="status?.protection === 'risky'"
              :disabled="busy"
              @change="onSetPolicy('risky')"
            />
            <span>
              <strong>Risky operations</strong>
              <small>Settings changes need a password. Music playback never does.</small>
            </span>
          </label>

          <label class="policy-option">
            <input
              type="radio"
              name="protection-policy"
              value="all"
              :checked="status?.protection === 'all'"
              :disabled="busy"
              @change="onSetPolicy('all')"
            />
            <span>
              <strong>Everything</strong>
              <small>All API access requires signing in first.</small>
            </span>
          </label>
        </div>

        <p v-if="policyError" class="security-error">{{ policyError }}</p>

        <button
          v-if="status?.protection !== 'off'"
          type="button"
          class="danger-link"
          :disabled="busy"
          @click="onTurnOff"
        >
          Turn off protection
        </button>
      </div>
    </div>
  </PageContent>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import PageContent from '@/components/PageContent.vue'
import Icon from '@/components/Icon.vue'
import { useAuthStore, type AuthHint } from '@/stores/auth'
import { AuthApiError, type ProtectionLevel } from '@/api/auth'

const authStore = useAuthStore()
const { status } = storeToRefs(authStore)

const loading = ref(true)
const loadError = ref<string | null>(null)
const busy = ref(false)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const remember = ref(false)
const passwordError = ref<string | null>(null)
const passwordSuccess = ref<string | null>(null)
const policyError = ref<string | null>(null)

const protectionLabel = computed(() => {
  switch (status.value?.protection) {
    case 'all':
      return 'everything requires a password'
    case 'risky':
      return 'settings changes require a password'
    case 'off':
      return 'off'
    default:
      return 'no password set yet'
  }
})

const canSavePassword = computed(
  () =>
    newPassword.value.length > 0 &&
    newPassword.value === confirmPassword.value &&
    (!status.value?.has_password || currentPassword.value.length > 0),
)

async function load() {
  loading.value = true
  loadError.value = null
  try {
    await authStore.refreshStatus()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

/** Risky auth-store actions (policy change, logout) can be called without
 *  an active session — open the same login/set-password prompt used
 *  elsewhere in the app so the flow feels consistent. */
async function ensureAuthenticated(): Promise<boolean> {
  if (status.value?.authenticated) return true
  const hint: AuthHint = status.value?.has_password ? 'login' : 'set-password'
  const ok = await authStore.promptForAuth(hint)
  if (ok) await authStore.refreshStatus()
  return ok
}

async function onSavePassword() {
  if (!canSavePassword.value || busy.value) return
  busy.value = true
  passwordError.value = null
  passwordSuccess.value = null
  try {
    const current = status.value?.has_password ? currentPassword.value : undefined
    await authStore.setPassword(newPassword.value, current, remember.value)
    passwordSuccess.value = status.value?.has_password
      ? 'Password changed.'
      : 'Password set. Settings changes are now protected.'
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (e) {
    passwordError.value = describeAuthError(e)
  } finally {
    busy.value = false
  }
}

async function onSetPolicy(protection: ProtectionLevel) {
  if (busy.value) return
  busy.value = true
  policyError.value = null
  try {
    if (!(await ensureAuthenticated())) return
    await authStore.setPolicy(protection)
  } catch (e) {
    policyError.value = describeAuthError(e)
  } finally {
    busy.value = false
  }
}

async function onTurnOff() {
  await onSetPolicy('off')
}

async function onLogout() {
  if (busy.value) return
  busy.value = true
  try {
    await authStore.logout()
  } catch {
    // best-effort: refresh status regardless so the UI reflects reality
  } finally {
    await authStore.refreshStatus()
    busy.value = false
  }
}

function describeAuthError(e: unknown): string {
  if (e instanceof AuthApiError) {
    if (e.status === 401) return 'Wrong password. Please try again.'
    if (e.status === 429) return 'Too many attempts. Please wait a moment and try again.'
  }
  return e instanceof Error ? e.message : String(e)
}

onMounted(load)
</script>

<style scoped lang="scss">
.security-content {
  display: grid;
  gap: 24px;
  max-width: 560px;

  .info-card {
    background: var(--background-card);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 24px;

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;

      .card-icon {
        width: 20px;
        height: 20px;
        color: var(--color-primary);
      }

      h2 {
        margin: 0;
        color: var(--color-head);
        font-size: 1.25rem;
        font-weight: 600;
      }
    }

    p {
      margin: 0 0 8px 0;
      color: var(--color-body-secondary);
      line-height: 1.6;
    }
  }
}

.status-line {
  display: flex;
  align-items: center;
  gap: 12px;

  strong {
    color: var(--color-head);
  }
}

.security-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;

  label {
    font-weight: 500;
    color: var(--color-head);
    margin-top: 4px;
  }

  input[type='password'] {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--background-input);
    color: var(--color-body);
    font-size: 1rem;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }
}

.security-remember {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  font-weight: 400;
  color: var(--color-body-secondary);

  input {
    width: auto;
  }
}

.security-error {
  color: var(--color-error, #dc3545);
}

.security-success {
  color: var(--color-success, #22c55e);
}

.save-button {
  @include button-base;
  @include button-primary;
  @include button-md;
  align-self: flex-start;
  margin-top: 8px;
}

.link-button {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 0.9rem;
  text-decoration: underline;
}

.policy-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.policy-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;

  input {
    margin-top: 4px;
    width: auto;
  }

  span {
    display: flex;
    flex-direction: column;
  }

  strong {
    color: var(--color-head);
  }

  small {
    color: var(--color-body-secondary);
  }
}

.danger-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-error, #dc3545);
  cursor: pointer;
  text-decoration: underline;
  font-size: 0.9rem;
}
</style>
