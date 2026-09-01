import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getAuthStatus,
  getCsrf as apiGetCsrf,
  login as apiLogin,
  logout as apiLogout,
  setPassword as apiSetPassword,
  setPolicy as apiSetPolicy,
  type AuthStatus,
  type ProtectionLevel,
} from '@/api/auth'

/** Mirrors the `WWW-Authenticate-Hint` header on a 401: no password has
 *  ever been set ('set-password'), or one has and we just need it
 *  ('login'). */
export type AuthHint = 'set-password' | 'login'

export const useAuthStore = defineStore('auth', () => {
  // State
  const status = ref<AuthStatus | null>(null)
  const csrf = ref<string | null>(null)
  const loading = ref(false)

  // Prompt state — a single shared in-flight prompt. Concurrent callers of
  // promptForAuth() while one is already open get the SAME promise back,
  // so one login unblocks every risky call that triggered a 401 at once.
  const promptOpen = ref(false)
  const promptHint = ref<AuthHint | null>(null)
  const promptError = ref<string | null>(null)
  let promptPromise: Promise<boolean> | null = null
  let promptResolve: ((value: boolean) => void) | null = null

  const refreshStatus = async (): Promise<AuthStatus> => {
    loading.value = true
    try {
      const result = await getAuthStatus()
      status.value = result
      return result
    } finally {
      loading.value = false
    }
  }

  const login = async (password: string, remember = false) => {
    const result = await apiLogin(password, remember)
    csrf.value = result.csrf
    await refreshStatus()
    return result
  }

  const setPassword = async (password: string, current?: string, remember = false) => {
    const result = await apiSetPassword(password, current, remember)
    csrf.value = result.csrf
    await refreshStatus()
    return result
  }

  /** The CSRF token lives only in memory, so a page reload loses it while
   *  the session cookie survives. The server requires it on logout, so
   *  rehydrate before asking — otherwise sign-out silently does nothing. */
  const logout = async () => {
    if (!csrf.value) await ensureCsrf()
    try {
      await apiLogout(csrf.value ?? undefined)
    } finally {
      csrf.value = null
      await refreshStatus()
    }
  }

  const setPolicy = async (protection: ProtectionLevel) => {
    await apiSetPolicy(protection, csrf.value ?? undefined)
    await refreshStatus()
  }

  /** Silently rehydrate the CSRF token from a still-valid session cookie.
   *  The token lives only in memory, so a page reload loses it while the
   *  HttpOnly session cookie survives (up to 12h, or 30d with "remember").
   *  `/api/auth/csrf` returns a fresh token iff the session is still valid,
   *  which lets a risky write recover without re-prompting for the password.
   *  Returns true when a token was obtained (session valid); false when the
   *  session is gone/expired (the caller should then prompt to log in). */
  const ensureCsrf = async (): Promise<boolean> => {
    try {
      const result = await apiGetCsrf()
      csrf.value = result.csrf
      return true
    } catch {
      csrf.value = null
      return false
    }
  }

  /** Opens (or joins) the auth modal for a 401 with the given hint and
   *  resolves once the user has authenticated (true) or cancelled (false).
   *  Called by apiFetch's 401 handler; SecurityPrompt.vue is the UI that
   *  eventually calls resolvePrompt(). */
  const promptForAuth = (hint: AuthHint): Promise<boolean> => {
    if (promptPromise) return promptPromise

    promptHint.value = hint
    promptError.value = null
    promptOpen.value = true

    promptPromise = new Promise<boolean>((resolve) => {
      promptResolve = resolve
    })
    return promptPromise
  }

  /** Settles the current prompt (if any) and closes the modal. */
  const resolvePrompt = (success: boolean) => {
    const resolve = promptResolve
    promptOpen.value = false
    promptHint.value = null
    promptResolve = null
    promptPromise = null
    resolve?.(success)
  }

  return {
    // State
    status,
    csrf,
    loading,
    promptOpen,
    promptHint,
    promptError,

    // Actions
    refreshStatus,
    login,
    setPassword,
    logout,
    setPolicy,
    ensureCsrf,
    promptForAuth,
    resolvePrompt,
  }
})
