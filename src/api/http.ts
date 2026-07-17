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
 * - On a 401, reads the `WWW-Authenticate-Hint` header and opens the auth
 *   prompt via the auth store; if the user authenticates, retries the
 *   original request once (picking up the freshly cached csrf). If the
 *   prompt is cancelled, throws.
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
  const authenticated = await authStore.promptForAuth(hint)
  if (!authenticated) {
    throw new Error('Authentication required')
  }

  return apiFetch(url, init, true)
}
