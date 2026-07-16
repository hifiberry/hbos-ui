import { useAppConfigStore } from '@/stores/appconfig'

export type ExtensionState = 'available' | 'installed' | 'upgradable'
export type ExtensionCategory = 'player' | 'dsp' | 'tool'
export type NeedsReboot = 'no' | 'maybe' | 'yes'

export type JobPhase =
  | 'queued'
  | 'downloading'
  | 'installing'
  | 'configuring'
  | 'done'
  | 'failed'

export const TERMINAL_PHASES: JobPhase[] = ['done', 'failed']

export interface Extension {
  package: string
  name: string
  category: ExtensionCategory
  summary: string
  description: string
  version: string | null
  installed_version: string | null
  state: ExtensionState
  needs_reboot: NeedsReboot
  icon_url: string | null
  /** "apt" for an apt-repo extension, "github:owner/name" for a GitHub one. */
  source: string
}

export interface GithubSource {
  id: string
  repo: string
}

export interface ExtensionJob {
  id: string
  package: string | null
  action: 'install' | 'uninstall' | 'refresh'
  phase: JobPhase
  percent: number
  exit_code: number | null
  error: string | null
  started_at: number
  finished_at: number | null
  log: string[]
}

export interface ExtensionSource {
  id: string
  uri: string
  suite: string
  components: string
  keyring: string
}

export interface ExtensionSourceInput {
  id: string
  uri: string
  suite: string
  components: string
  key: string
}

export interface ExtensionsApiResponse<T> {
  status: 'success' | 'error'
  message?: string
  count?: number
  data: T
}

/** Responses that carry no data payload (e.g. removing a source). */
export interface ExtensionsApiAck {
  status: 'success' | 'error'
  message?: string
}

const baseUrl = () => useAppConfigStore().getConfigApiBaseUrl()

/** Throw with the server's message when it gave us one — the marker-gate
 *  rejection is the message the user needs to see. */
const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = init ? await fetch(url, init) : await fetch(url)
  if (!response.ok) {
    let message = `${response.status}`
    try {
      const body = await response.json()
      if (body?.message) message = body.message
    } catch {
      // no JSON body; the status code is all we have
    }
    throw new Error(`Extensions API request failed: ${message}`)
  }
  return response.json()
}

const postJson = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const listExtensions = () =>
  request<ExtensionsApiResponse<{ extensions: Extension[] }>>(`${baseUrl()}/extensions`)

export const getExtension = (pkg: string) =>
  request<ExtensionsApiResponse<Extension>>(
    `${baseUrl()}/extensions/${encodeURIComponent(pkg)}`,
  )

export const installExtension = (pkg: string) =>
  request<ExtensionsApiResponse<{ job: ExtensionJob }>>(
    `${baseUrl()}/extensions/${encodeURIComponent(pkg)}/install`,
    { method: 'POST' },
  )

export const uninstallExtension = (pkg: string) =>
  request<ExtensionsApiResponse<{ job: ExtensionJob }>>(
    `${baseUrl()}/extensions/${encodeURIComponent(pkg)}/uninstall`,
    { method: 'POST' },
  )

export const refreshExtensions = () =>
  request<ExtensionsApiResponse<{ job: ExtensionJob }>>(
    `${baseUrl()}/extensions/refresh`,
    { method: 'POST' },
  )

export const getExtensionJob = (jobId: string) =>
  request<ExtensionsApiResponse<{ job: ExtensionJob; reboot_required: boolean }>>(
    `${baseUrl()}/extensions/jobs/${encodeURIComponent(jobId)}`,
  )

export const listExtensionSources = () =>
  request<ExtensionsApiResponse<{ sources: ExtensionSource[] }>>(
    `${baseUrl()}/extensions/sources`,
  )

export const addExtensionSource = (input: ExtensionSourceInput) =>
  request<ExtensionsApiResponse<{ source: ExtensionSource }>>(
    `${baseUrl()}/extensions/sources`,
    postJson(input),
  )

export const removeExtensionSource = (id: string) =>
  request<ExtensionsApiAck>(
    `${baseUrl()}/extensions/sources/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )

export const listGithubSources = () =>
  request<ExtensionsApiResponse<{ sources: GithubSource[] }>>(
    `${baseUrl()}/extensions/github-sources`,
  )

export const addGithubSource = (repo: string) =>
  request<ExtensionsApiResponse<{ source: GithubSource }>>(
    `${baseUrl()}/extensions/github-sources`,
    postJson({ repo }),
  )

export const removeGithubSource = (id: string) =>
  request<ExtensionsApiAck>(
    `${baseUrl()}/extensions/github-sources/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
