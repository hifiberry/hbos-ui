<template>
  <PageContent title="Security" :backrouterLink="{ name: 'services' }">
    <div class="security-content">
      <div class="services-header">
        <h2>Password protection</h2>
        <p>
          Music playback, volume and browsing your library never need a password. A password
          protects settings changes only &mdash; you decide how much it covers below.
        </p>
      </div>

      <!-- Status -->
      <section class="security-card status-card">
        <div class="card-main">
          <Icon icon="lock" class="card-icon" />
          <div class="card-body">
            <h3>Status</h3>
            <p v-if="loading" class="card-desc">Loading&hellip;</p>
            <dl v-else class="status-grid">
              <div class="status-item">
                <dt>Protection</dt>
                <dd>{{ protectionLabel }}</dd>
              </div>
              <div class="status-item">
                <dt>Password</dt>
                <dd>{{ status?.has_password ? 'Set' : 'Not set' }}</dd>
              </div>
              <div class="status-item">
                <dt>This session</dt>
                <dd>{{ status?.authenticated ? 'Signed in' : 'Not signed in' }}</dd>
              </div>
            </dl>
            <StatusBlock v-if="loadError" variant="error" class="security-error">{{ loadError }}</StatusBlock>
          </div>
        </div>
        <div v-if="status?.authenticated" class="card-actions">
          <button type="button" class="btn-secondary" :disabled="busy" @click="onLogout">
            Log out
          </button>
        </div>
      </section>

      <!-- Password -->
      <section class="security-card">
        <div class="card-main">
          <Icon icon="lock" class="card-icon" />
          <div class="card-body">
            <h3>{{ status?.has_password ? 'Change password' : 'Set a password' }}</h3>
            <p class="card-desc">
              {{
                status?.has_password
                  ? 'Update the password used to protect settings changes.'
                  : 'Set a password to protect settings changes on this device.'
              }}
            </p>

            <form class="password-form" @submit.prevent="onSavePassword">
              <div class="field-row">
                <div v-if="status?.has_password" class="field">
                  <label for="current-password">Current password</label>
                  <input
                    id="current-password"
                    v-model="currentPassword"
                    type="password"
                    autocomplete="current-password"
                    :disabled="busy"
                  />
                </div>

                <div class="field">
                  <label for="new-password">{{
                    status?.has_password ? 'New password' : 'Password'
                  }}</label>
                  <input
                    id="new-password"
                    v-model="newPassword"
                    type="password"
                    autocomplete="new-password"
                    :disabled="busy"
                  />
                </div>

                <div class="field">
                  <label for="confirm-password">Confirm password</label>
                  <input
                    id="confirm-password"
                    v-model="confirmPassword"
                    type="password"
                    autocomplete="new-password"
                    :disabled="busy"
                  />
                </div>
              </div>

              <label class="security-remember">
                <input v-model="remember" type="checkbox" :disabled="busy" />
                Remember on this device
              </label>

              <StatusBlock v-if="passwordError" variant="error" class="security-error">{{ passwordError }}</StatusBlock>
              <StatusBlock v-if="passwordSuccess" variant="success" class="security-success">{{ passwordSuccess }}</StatusBlock>

              <button type="submit" class="btn-primary" :disabled="busy || !canSavePassword">
                {{ status?.has_password ? 'Change password' : 'Set a password' }}
              </button>
            </form>
          </div>
        </div>
      </section>

      <!-- Protection scope -->
      <section v-if="status?.has_password" class="security-card">
        <div class="card-main">
          <Icon icon="tabler/adjustments" class="card-icon" />
          <div class="card-body">
            <h3>Require password for</h3>

            <div class="policy-options">
              <label class="policy-option" :class="{ active: status?.protection === 'risky' }">
                <input
                  type="radio"
                  name="protection-policy"
                  value="risky"
                  :checked="status?.protection === 'risky'"
                  :disabled="busy"
                  @change="onSetPolicy('risky')"
                />
                <span class="policy-text">
                  <strong>Risky operations</strong>
                  <small>Settings changes need a password. Music playback never does.</small>
                </span>
              </label>

              <label class="policy-option" :class="{ active: status?.protection === 'all' }">
                <input
                  type="radio"
                  name="protection-policy"
                  value="all"
                  :checked="status?.protection === 'all'"
                  :disabled="busy"
                  @change="onSetPolicy('all')"
                />
                <span class="policy-text">
                  <strong>Everything</strong>
                  <small>All API access requires signing in first.</small>
                </span>
              </label>
            </div>

            <StatusBlock v-if="policyError" variant="error" class="security-error">{{ policyError }}</StatusBlock>

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
      </section>
    </div>
  </PageContent>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import PageContent from '@/components/PageContent.vue'
import Icon from '@/components/Icon.vue'
import StatusBlock from '@/components/StatusBlock.vue'
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
    // ensureAuthenticated() only checks the status flag, which stays true on
    // a reload while the in-memory token is gone. A 401 here means the
    // session expired, not that a password was mistyped.
    policyError.value =
      e instanceof AuthApiError && e.status === 401
        ? 'Your session has expired. Sign in again and retry.'
        : describeAuthError(e)
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
  loadError.value = null
  try {
    await authStore.logout()
  } catch (e) {
    // A session that was already gone resolves in the store — the user is
    // signed out and there is nothing to report. Anything reaching here is
    // a real failure. A 401 among them means the daemon refused a token it
    // had just issued, which is not a wrong password, so describeAuthError
    // would mislabel it.
    loadError.value =
      e instanceof AuthApiError && e.status === 401
        ? 'Signing out was refused. Reload the page and try again.'
        : describeAuthError(e)
  } finally {
    // The store refreshes status itself; doing it again here only doubles
    // the request.
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
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.services-header {
  margin-bottom: 16px;

  h2 {
    margin: 0 0 8px 0;
    color: var(--color-head);
  }

  p {
    margin: 0;
    max-width: 720px;
    color: var(--color-body-secondary);
    line-height: 1.5;
  }
}

.security-card {
  background: var(--background-card);
  border: 1px solid rgba(128, 128, 128, 0.18);
  border-radius: 8px;
  padding: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;

  .card-main {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    flex: 1;
    min-width: 0;
  }

  .card-icon {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    color: var(--primary);
    margin-top: 2px;
  }

  .card-body {
    flex: 1;
    min-width: 0;

    h3 {
      margin: 0 0 4px 0;
      color: var(--color-head);
      font-size: 1.15rem;
      font-weight: 600;
    }

    .card-desc {
      margin: 0;
      color: var(--color-body-secondary);
      font-size: 0.9rem;
      line-height: 1.5;
    }
  }

  .card-actions {
    flex-shrink: 0;
  }
}

/* Status card: stats laid out across the full width */
.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px 32px;
  margin: 12px 0 0 0;

  .status-item {
    display: flex;
    flex-direction: column;
    gap: 2px;

    dt {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-body-secondary);
    }

    dd {
      margin: 0;
      color: var(--color-head);
      font-weight: 600;
    }
  }
}

/* Password form: fields spread across the width on wide screens */
.password-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;

  .field-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;

    label {
      font-weight: 500;
      font-size: 0.9rem;
      color: var(--color-head);
    }

    input[type='password'] {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid rgba(128, 128, 128, 0.4);
      border-radius: 6px;
      background: var(--background-body, #fafafa);
      color: var(--color-body);
      font-size: 1rem;

      &:focus {
        outline: none;
        border-color: var(--primary);
      }
    }
  }
}

.security-remember {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--color-body-secondary);

  input {
    width: auto;
  }
}

// Type scale only - StatusBlock carries the tint, the border and the icon.
.security-error,
.security-success {
  font-size: 0.9rem;
}

// .password-form spaces its children with `gap`; .card-body does not, so the
// two blocks that sit directly in it need their own margins. As a one-line
// paragraph they needed none.
.card-body > .security-error,
.card-body > .security-success {
  margin: 12px 0;
}

.btn-primary {
  @include button-base;
  @include button-primary;
  @include button-md;
  align-self: flex-start;
}

.btn-secondary {
  @include button-base;
  @include button-secondary;
  @include button-md;
}

/* Protection scope: full-width selectable rows */
.policy-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0 12px 0;
}

.policy-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(128, 128, 128, 0.3);
  border-radius: 6px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;

  &:hover {
    border-color: var(--primary);
  }

  &.active {
    border-color: var(--primary);
    background: var(--background-body, #fafafa);
  }

  input {
    margin-top: 3px;
    width: auto;
    flex-shrink: 0;
  }

  .policy-text {
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong {
      color: var(--color-head);
    }

    small {
      color: var(--color-body-secondary);
      line-height: 1.4;
    }
  }
}

// The one place in this stage that keeps a state colour on text: a control may
// wear it as its label. --color-error measures 4.83:1 on the light card and
// 4.57:1 on the dark one, and the underline means the colour is not the only
// cue. Deliberately not a StatusBlock - it is a button, not a message.
.danger-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-error);
  cursor: pointer;
  text-decoration: underline;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .security-card {
    flex-direction: column;
    align-items: stretch;

    .card-actions {
      align-self: flex-start;
    }
  }
}
</style>
