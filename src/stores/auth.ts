import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  AuthApiError,
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

  /** Fetch a token, keeping the distinction ensureCsrf()'s boolean discards:
   *  only a 401 from `/api/auth/csrf` means the session is gone. An outage
   *  there is a failure like any other and must not masquerade as one. */
  const fetchCsrf = async (): Promise<'ok' | 'session-gone'> => {
    try {
      csrf.value = (await apiGetCsrf()).csrf
      return 'ok'
    } catch (e) {
      csrf.value = null
      if (e instanceof AuthApiError && e.status === 401) return 'session-gone'
      throw e
    }
  }

  /** Run a write that needs the CSRF token, rehydrating and retrying the way
   *  `apiFetch` already does for its own callers (src/api/http.ts). The token
   *  lives only in memory, so a page reload loses it while the session cookie
   *  survives; and a token that survived can still be stale, because another
   *  tab logging in again rotates the cookie.
   *
   *  Returns 'done' when the write went through, and 'session-gone' when the
   *  session turned out to be dead; everything else throws.
   *
   *  What a dead session means is the caller's to decide: for signing out it
   *  is success, because there is nothing left to end; for any other write it
   *  is a failure the user has to be told about.
   *
   *  A 401 on a token minted moments earlier is not an expiry — `/api/auth/csrf`
   *  only answers for a valid session — so it propagates rather than being
   *  retried or swallowed. The cached token is discarded only when it is spent
   *  or refused: a 5xx or a network failure leaves both the session and the
   *  token good, and dropping it there would break the next write. */
  const withCsrf = async (
    send: (token: string | undefined) => Promise<void>,
  ): Promise<'done' | 'session-gone'> => {
    const hadCachedToken = !!csrf.value
    if (!hadCachedToken && (await fetchCsrf()) === 'session-gone') return 'session-gone'
    try {
      await send(csrf.value ?? undefined)
    } catch (e) {
      if (!(e instanceof AuthApiError && e.status === 401)) throw e
      csrf.value = null // refused, so spent either way
      // Only an already-cached token can be stale; one minted moments ago
      // cannot, so a 401 on it is the daemon refusing what it just issued.
      if (!hadCachedToken) throw e
      if ((await fetchCsrf()) === 'session-gone') return 'session-gone'
      try {
        await send(csrf.value ?? undefined)
      } catch (retryError) {
        if (retryError instanceof AuthApiError && retryError.status === 401) csrf.value = null
        throw retryError
      }
    }
    return 'done'
  }

  const logout = async () => {
    try {
      // Either the session ended here or it had already ended; both leave the
      // user signed out, and the token is spent either way. withCsrf() clears
      // a refused token itself, so there is nothing to mop up on failure.
      await withCsrf((token) => apiLogout(token))
      csrf.value = null
    } finally {
      // Never let a failed status refresh replace the error being thrown.
      await refreshStatus().catch(() => {})
    }
  }

  const setPolicy = async (protection: ProtectionLevel) => {
    // Unlike signing out, a dead session means the policy did NOT change.
    if ((await withCsrf((token) => apiSetPolicy(protection, token))) === 'session-gone') {
      throw new AuthApiError(401, 'session expired')
    }
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
