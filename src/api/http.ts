import { useAuthStore, type AuthHint } from '@/stores/auth'

const BODY_LESS_METHODS = new Set(['GET', 'HEAD'])

const needsCsrf = (method?: string): boolean => !BODY_LESS_METHODS.has((method ?? 'GET').toUpperCase())

const parseHint = (response: Response): AuthHint => {
  const hint = response.headers.get('WWW-Authenticate-Hint')
  return hint === 'set-password' ? 'set-password' : 'login'
}

/**
 * Central fetch wrapper for every risky-capable API call.
 *
 * - Sends `credentials: 'same-origin'` so the auth session cookie rides.
 * - Attaches `X-CSRF-Token` (from the auth store's cached csrf) on
 *   non-GET/HEAD requests.
 * - On a 401, reads the `WWW-Authenticate-Hint` header. A `login`-hinted 401
 *   on a risky write often just means the in-memory csrf token was lost on a
 *   page reload while the session cookie is still valid, so we first try to
 *   silently rehydrate the token (auth store `ensureCsrf`) and retry without
 *   bothering the user. Only if that fails (session truly gone) do we open the
 *   auth prompt via the store; if the user authenticates, we retry once. If
 *   the prompt is cancelled, throws.
 * - Any other response (including a second 401 after the retry) is passed
 *   through unchanged — callers keep their existing `.ok`/json handling.
 */
export async function apiFetch(
  url: string,
  init: RequestInit = {},
  _isRetry = false,
): Promise<Response> {
  const authStore = useAuthStore()

  const headers = new Headers(init.headers)
  if (needsCsrf(init.method) && authStore.csrf) {
    headers.set('X-CSRF-Token', authStore.csrf)
  }

  const response = await fetch(url, {
    ...init,
    credentials: 'same-origin',
    headers,
  })

  if (response.status !== 401 || _isRetry) {
    return response
  }

  const hint = parseHint(response)

  // A `login`-hinted 401 on a risky write can simply mean our in-memory csrf
  // token was lost (e.g. a page reload) while the session cookie is still
  // valid. Try to rehydrate the token silently before prompting; if it works,
  // retry the original request with no user interaction.
  if (hint === 'login' && needsCsrf(init.method) && (await authStore.ensureCsrf())) {
    return apiFetch(url, init, true)
  }

  const authenticated = await authStore.promptForAuth(hint)
  if (!authenticated) {
    throw new Error('Authentication required')
  }

  return apiFetch(url, init, true)
}
