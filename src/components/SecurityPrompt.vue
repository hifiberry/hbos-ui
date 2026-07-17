<template>
  <div v-if="authStore.promptOpen" class="modal-overlay" @click="onOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>{{ isSetPassword ? 'Protect your settings' : 'Enter your password' }}</h2>
        <button class="close-button" title="Close" @click="cancel">
          <Icon icon="close" />
        </button>
      </div>

      <div class="modal-body">
        <div class="security-icon">
          <Icon icon="lock" class="lock-icon" />
        </div>

        <p v-if="isSetPassword" class="security-explainer">
          This action can change your system's configuration. Music playback, volume and
          browsing your library never need a password &mdash; only settings changes like this
          one do.
        </p>
        <p v-else class="security-explainer">
          This setting is protected. Enter your password to continue.
        </p>

        <form class="security-form" @submit.prevent="onSubmit">
          <label for="security-prompt-password" class="security-label">Password</label>
          <input
            id="security-prompt-password"
            ref="passwordInput"
            v-model="password"
            type="password"
            class="security-input"
            autocomplete="current-password"
            :disabled="busy"
          />

          <label class="security-remember">
            <input v-model="remember" type="checkbox" :disabled="busy" />
            Remember on this device
          </label>

          <p v-if="error" class="security-error">{{ error }}</p>
        </form>
      </div>

      <div class="modal-footer">
        <button v-if="isSetPassword" type="button" class="not-now-button" :disabled="busy" @click="onNotNow">
          Not now
        </button>
        <button v-else type="button" class="cancel-button" :disabled="busy" @click="cancel">
          Cancel
        </button>
        <button
          type="button"
          class="confirm-button"
          :disabled="busy || !password"
          @click="onSubmit"
        >
          {{ isSetPassword ? 'Set a password' : 'Unlock' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import { useAuthStore } from '@/stores/auth'
import { AuthApiError } from '@/api/auth'

const authStore = useAuthStore()

const password = ref('')
const remember = ref(false)
const error = ref<string | null>(null)
const busy = ref(false)
const passwordInput = ref<HTMLInputElement | null>(null)

const isSetPassword = computed(() => authStore.promptHint === 'set-password')

function reset() {
  password.value = ''
  remember.value = false
  error.value = null
  busy.value = false
}

watch(
  () => authStore.promptOpen,
  (open) => {
    if (open) {
      reset()
      void nextTick(() => passwordInput.value?.focus())
    }
  },
)

async function onSubmit() {
  if (!password.value || busy.value) return
  busy.value = true
  error.value = null
  try {
    if (isSetPassword.value) {
      await authStore.setPassword(password.value, undefined, remember.value)
    } else {
      await authStore.login(password.value, remember.value)
    }
    authStore.resolvePrompt(true)
  } catch (e) {
    if (e instanceof AuthApiError && e.status === 401) {
      error.value = 'Wrong password. Please try again.'
    } else if (e instanceof AuthApiError && e.status === 429) {
      error.value = 'Too many attempts. Please wait a moment and try again.'
    } else {
      error.value = e instanceof Error ? e.message : String(e)
    }
  } finally {
    busy.value = false
  }
}

async function onNotNow() {
  busy.value = true
  error.value = null
  try {
    // Leave protection off; the action that triggered this prompt proceeds
    // as if it had never needed authentication.
    await authStore.setPolicy('off')
    authStore.resolvePrompt(true)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}

function cancel() {
  if (busy.value) return
  authStore.resolvePrompt(false)
}

function onOverlayClick() {
  cancel()
}
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-content {
  background: var(--background-card);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 420px;
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 0 24px;

  h2 {
    margin: 0;
    color: var(--color-head);
    font-size: 1.35rem;
    font-weight: 600;
  }

  .close-button {
    background: none;
    border: none;
    padding: 8px;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-body-secondary);

    &:hover {
      background: var(--color-border);
      color: var(--color-head);
    }
  }
}

.modal-body {
  padding: 24px;
}

.security-icon {
  text-align: center;
  margin-bottom: 12px;

  .lock-icon {
    width: 40px;
    height: 40px;
    color: var(--color-primary);
  }
}

.security-explainer {
  color: var(--color-body-secondary);
  line-height: 1.5;
  margin: 0 0 20px 0;
  text-align: center;
}

.security-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.security-label {
  font-weight: 500;
  color: var(--color-head);
}

.security-input {
  width: 100%;
  padding: 12px;
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

.security-remember {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-body-secondary);
  font-size: 0.9rem;
  margin-top: 4px;

  input {
    width: auto;
  }
}

.security-error {
  color: var(--color-error, #dc3545);
  margin: 4px 0 0 0;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 0 24px 24px 24px;
  justify-content: flex-end;

  button {
    @include button-base;
    @include button-md;
  }

  .cancel-button,
  .not-now-button {
    @include button-secondary;
  }

  .confirm-button {
    @include button-primary;
  }
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: 10px;
  }

  .modal-footer {
    flex-direction: column;

    button {
      width: 100%;
    }
  }
}
</style>
