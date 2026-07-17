// Auth gateway client. Unlike the other api/*.ts modules this one does NOT
// go through the config/audiocontrol proxy machinery in stores/appconfig:
// the session is an HttpOnly cookie, so the auth endpoints must always be
// called same-origin (the UI is served same-origin behind nginx in prod).
//
// This module is intentionally a "leaf" — it does not import
// `@/api/http` (apiFetch) or `@/stores/auth`. apiFetch's 401 handling
// calls into the auth store, which calls the functions here; if this file
// routed its own requests back through apiFetch we'd have a dependency
// cycle (and a 401 from e.g. `login` would try to prompt-for-auth again).

export type ProtectionLevel = 'unset' | 'off' | 'risky' | 'all'

export interface AuthStatus {
  protection: ProtectionLevel
  has_password: boolean
  authenticated: boolean
}

export interface AuthTokenResponse {
  csrf: string
}

/** Thrown for non-2xx responses. Carries the HTTP status so callers (the
 *  login/set-password prompt) can distinguish "wrong password" (401) from
 *  "rate limited" (429) from anything else. */
export class AuthApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
  }
}

const authBaseUrl = () => `${window.location.origin}/api/auth`

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${authBaseUrl()}${path}`, {
    // The session cookie is HttpOnly and same-origin; this must be set on
    // every auth call (including GETs) so the cookie rides both ways.
    credentials: 'same-origin',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    let message = `${response.status}`
    try {
      const body = await response.json()
      if (body?.message) message = body.message
    } catch {
      // no JSON body; the status code is all we have
    }
    throw new AuthApiError(response.status, message)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return response.json()
}

/** Non-GET requests get a CSRF header when a token is available. `csrf` is
 *  omitted for `login`/`set-password` themselves (there's no session to
 *  protect yet); it's required in practice for `logout`/`setPolicy`, which
 *  the auth store passes in from its cached token. */
const csrfHeaders = (csrf?: string): HeadersInit | undefined =>
  csrf ? { 'X-CSRF-Token': csrf } : undefined

export const getAuthStatus = (): Promise<AuthStatus> => request<AuthStatus>('/status')

export const login = (password: string, remember = false): Promise<AuthTokenResponse> =>
  request<AuthTokenResponse>('/login', {
    method: 'POST',
    body: JSON.stringify({ password, remember }),
  })

export const setPassword = (
  password: string,
  current?: string,
  remember = false,
): Promise<AuthTokenResponse> =>
  request<AuthTokenResponse>('/set-password', {
    method: 'POST',
    body: JSON.stringify({ password, ...(current ? { current } : {}), remember }),
  })

export const logout = (csrf?: string): Promise<void> =>
  request<void>('/logout', {
    method: 'POST',
    headers: csrfHeaders(csrf),
  })

export const setPolicy = (protection: ProtectionLevel, csrf?: string): Promise<void> =>
  request<void>('/policy', {
    method: 'POST',
    headers: csrfHeaders(csrf),
    body: JSON.stringify({ protection }),
  })

export const getCsrf = (): Promise<AuthTokenResponse> => request<AuthTokenResponse>('/csrf')
