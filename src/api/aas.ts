/**
 * REST client for the `aas` audio server (`/api/aas/v1`).
 *
 * Like `api/pipewire.ts`, every call returns the parsed body or an `ApiError`.
 */
import { useAppConfigStore } from '@/stores/appconfig'
import { apiFetch } from '@/api/http'
import type { ApiError } from '@/api/pipewire'

export type { ApiError }

export type AasResponse<T> = T | ApiError

export interface AasRoute {
  /** `players.left`, `players.right`, `analog.left` or `analog.right`. */
  from: string
  to: number
  gain_db?: number
}

export interface AasMatrixOutput {
  output: number
  routes: AasRoute[]
}

export interface AasMatrix {
  outputs: AasMatrixOutput[]
}

export interface AasPluginParam {
  name: string
  unit: string
  type: string
  min: number
  max: number
  default: number
  value: number
}

export interface AasPlugin {
  /** Like `1/output/0`. */
  id: string
  type: 'balance' | 'detect' | 'library'
  name: string
  enabled: boolean
  neutral: boolean
  latency_frames: number
  params: AasPluginParam[]
}

export function isAasError(response: unknown): response is ApiError {
  return typeof response === 'object' && response !== null && 'error' in response
}

async function request<T>(path: string, init?: RequestInit): Promise<AasResponse<T>> {
  try {
    const base = useAppConfigStore().getAasApiBaseUrl()
    const response = await apiFetch(`${base}${path}`, init)

    let data: unknown = null
    try {
      data = await response.json()
    } catch {
      data = null
    }

    if (!response.ok) {
      const message =
        typeof data === 'object' && data !== null && 'message' in data
          ? String((data as { message: unknown }).message)
          : `HTTP ${response.status}`
      return { error: `HTTP ${response.status}`, message }
    }
    return data as T
  } catch (error) {
    return {
      error: 'Network Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const getState = () => request<unknown>('/state')

export const getPlugins = () => request<AasPlugin[]>('/plugins')

/** `id` is like `1/output/0`; the slashes are part of the path. */
export const setPluginParams = (id: string, params: Record<string, number>) =>
  request<unknown>(`/plugins/${id}`, jsonInit('PATCH', { params }))

export const getMatrix = () => request<AasMatrix>('/matrix')

export const putMatrix = (matrix: AasMatrix) => request<unknown>('/matrix', jsonInit('PUT', matrix))

/** An output as `GET /outputs/N` gives it. `limit_db` is on the master only, and only from an aas that has the limit (after 0.2.0). */
export interface AasOutput {
  id: number
  volume?: number
  limit_db?: number
}

export const getOutput = (id: number) => request<AasOutput>(`/outputs/${id}`)

/** The master's volume limit, -60 to 0 dB: a ceiling no player gets around. */
export const setOutputLimit = (db: number) =>
  request<AasOutput>('/outputs/1', jsonInit('PATCH', { limit_db: db }))
