/**
 * PipeWire REST API Client
 *
 * This module provides TypeScript bindings for the PipeWire REST API.
 * API Documentation: https://github.com/hifiberry/pipewire-api/tree/master/docs
 *
 * Base URL: http://localhost:2716/api/v1
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface ApiError {
  error: string
  message: string
}

export type ApiResponse<T> = T | ApiError

function isApiError(response: unknown): response is ApiError {
  return typeof response === 'object' && response !== null && 'error' in response
}

// Core API Types

/**
 * ```json
 * {
 *  path: "/api/v1",
 *  {
 *    0: "GET"
 *  },
 *  description: "List all available API endpoints"
 * }
 * ```
 */
export interface ApiEndpoint {
  path: string
  methods: string[]
  description: string
}

/**
 * Struct that gets returned from `/api/pipewire/v1`
 * ```json
 * {
 *  version: "1.0",
 *  endpoints: ApiEndpoint, ApiEndpoint...
 * }
 * ```
 */
export interface ApiInfo {
  version: string
  endpoints: ApiEndpoint[]
}

/**
 * Struct that gets returned from `/api/pipewire/v1/version`
 * ```json
 * {
 *  version: "2.0.9",
 *  api_version: "1.0"
 * }
 * ```
 */
export interface VersionInfo {
  version: string
  api_version: string
}

/**
 * Struct that contains a pipewire object's information.
 * Those objects can be found from the objects array from
 * `/api/pipewire/v1/ls`.
 * ```json
 * {
 *  id: 2,
 *  name: "libpipewire-module-protocol-native",
 *  type: "module",
 *  media_class: "Other"
 * }
 * ```
 */
export interface PipewireObject {
  id: number
  name: string
  type: 'node' | 'device' | 'port' | 'link' | 'client' | 'module' | 'factory'
}

/**
 * Struct that gets returned from `/api/pipewire/v1/ls`.
 * This is just an array of pipewire object's, explained
 * above.
 */
export interface PipewireObjectsList {
  objects: PipewireObject[]
}

export interface PipewireObjectWithProperties extends PipewireObject {
  properties: Record<string, unknown>
}

export interface PipewirePropertiesList {
  objects: PipewireObjectWithProperties[]
}

export interface CacheRefreshResponse {
  status: string
  message: string
  object_count: number
}

// Volume API Types
export type ObjectType = 'device' | 'sink' | 'source'

export interface VolumeInfo {
  id: number
  name: string
  object_type: ObjectType
  volume: number
}

export interface VolumeSetRequest {
  volume: number
}

export interface VolumeSetResponse {
  volume: number
}

export interface VolumeSaveResponse {
  success: true
  message: string
}

export interface VolumeSaveByIdResponse extends VolumeSaveResponse {
  id: number
  name: string
  volume: number
}

// Links API Types
export interface PortInfo {
  id: number
  name: string
  node_name: string
  port_name: string
}

export interface LinkInfo {
  id: number
  output_port_id: number
  output_port_name: string
  input_port_id: number
  input_port_name: string
}

export interface LinksList {
  links: LinkInfo[]
}

export interface PortsList {
  ports: PortInfo[]
}

export interface CreateLinkRequest {
  output: string
  input: string
}

export interface CreateLinkResponse {
  status: string
  message: string
  link_id: number
}

export interface RemoveLinkResponse {
  status: string
  message: string
  link_id?: number
}

export interface LinkExistsResponse {
  exists: boolean
  link_id?: number
}

// SpeakerEQ API Types
export type EQType = 'off' | 'low_shelf' | 'high_shelf' | 'peaking' | 'low_pass' | 'high_pass' | 'band_pass' | 'notch' | 'all_pass'

export interface EQBlock {
  id: string
  type: 'eq' | 'crossbar' | 'volume'
  slots: number
}

export interface SpeakerEQStructure {
  name: string
  version: string
  blocks: EQBlock[]
  inputs: number
  outputs: number
  enabled: boolean
  licensed: boolean
}

export interface SpeakerEQIO {
  inputs: number
  outputs: number
}

export interface SpeakerEQConfig {
  inputs: number
  outputs: number
  eq_slots: Record<string, number>
  plugin_name: string
  method: string
}

export interface EQBand {
  band: number
  type: EQType | string
  frequency: number
  q: number
  gain: number
  enabled?: boolean
}

export interface ChannelStatus {
  id: string
  type: 'input' | 'output'
  gain_db: number
  delay_ms?: number
  eq_bands: EQBand[]
}

export interface SpeakerEQStatus {
  enabled: boolean
  master_gain_db: number
  crossbar: Record<string, number>
  inputs: ChannelStatus[]
  outputs: ChannelStatus[]
}

export interface EQBandResponse extends EQBand {
  block: string
}

export interface EQBandUpdateRequest {
  type?: EQType | string
  frequency?: number
  q?: number
  gain?: number
  enabled?: boolean
}

export interface EQBandUpdateResponse {
  success: boolean
  block: string
  band: number
  updated: EQBand
}

export interface EQBandEnabledRequest {
  enabled: boolean
}

export interface EQBandEnabledResponse {
  enabled: boolean
}

export interface EQClearResponse {
  block: string
  message: string
}

export interface GainResponse {
  gain: number
}

export interface GainSetRequest {
  gain: number
}

export interface GainSetResponse {
  success: boolean
  gain: number
}

export interface DelayInfo {
  channel: number
  ms: number
}

export interface DelaysResponse {
  delays: DelayInfo[]
}

export interface DelaySetRequest {
  ms: number
}

export interface DelaySetResponse {
  success: boolean
  channel: number
  ms: number
}

export interface CrossbarMatrix {
  matrix: number[][]
}

export interface CrossbarSetRequest {
  value: number
}

export interface CrossbarSetResponse {
  success: boolean
  input: number
  output: number
  value: number
}

export interface EnableStatusResponse {
  enabled: boolean
  licensed: boolean
}

export interface EnableSetRequest {
  enabled: boolean
}

export interface EnableSetResponse {
  success: boolean
  enabled: boolean
}

export interface RefreshResponse {
  message: string
}

export interface DefaultResponse {
  status: string
  message: string
}

export interface LicenseResponse {
  licensed: boolean
}

// RIAA API Types
export interface RIAAConfig {
  gain_db: number
  subsonic_filter: number
  riaa_enable: boolean
  declick_enable: boolean
  spike_threshold_db: number
  spike_width_ms: number
  notch_filter_enable: boolean
  notch_frequency_hz: number
  notch_q_factor: number
}

export interface RIAAGainResponse {
  gain_db: number
}

export interface RIAAGainSetRequest {
  gain_db: number
}

export interface RIAAGainSetResponse {
  success: boolean
  gain_db: number
}

export interface RIAASubsonicResponse {
  filter: number
}

export interface RIAASubsonicSetRequest {
  filter: number
}

export interface RIAASubsonicSetResponse {
  success: boolean
  filter: number
}

export interface RIAAEnableResponse {
  enabled: boolean
}

export interface RIAAEnableSetRequest {
  enabled: boolean
}

export interface RIAAEnableSetResponse {
  success: boolean
  enabled: boolean
}

export interface RIAASpikeResponse {
  threshold_db: number
  width_ms: number
}

export interface RIAASpikeSetRequest {
  threshold_db: number
  width_ms: number
}

export interface RIAASpikeSetResponse {
  success: boolean
  threshold_db: number
  width_ms: number
}

export interface RIAANotchResponse {
  enabled: boolean
  frequency_hz: number
  q_factor: number
}

export interface RIAANotchSetRequest {
  enabled: boolean
  frequency_hz: number
  q_factor: number
}

export interface RIAANotchSetResponse {
  success: boolean
  enabled: boolean
  frequency_hz: number
  q_factor: number
}

// ============================================================================
// API Client
// ============================================================================

import { useAppConfigStore } from '@/stores/appconfig'

/**
 * Gets the api config url from the `configStore`.
 * If development is happening using a proxy, it will adjust
 * the url accordingly.
 *
 * @returns {string} the full url for the api
 */
function getApiBaseUrl(): string {
  const configStore = useAppConfigStore()
  const { deviceIP, devicePort, useProxy } = configStore.config.audiocontrol_api

  if (useProxy) {
    // Use proxy in development
    return `${window.location.origin}/api/pipewire/v1`
  } else {
    // Direct connection in production
    const portSuffix = devicePort === 80 ? '' : `:${devicePort}`
    return `http://${deviceIP}${portSuffix}/api/pipewire/v1`
  }
}

/**
 * Requests a given api endpoint and returns
 * the response of a given type.
 *
 *
 * Example:
 * ```typescript
 *  return apiRequest<CacheRefreshResponse>('/cache/refresh', { method: 'POST' })
 * ```
 *
 * This requests the api endpoint `/cache/refresh` and
 * expects the type `CacheRefreshResponse`. It also uses
 * the POST method.
 *
 * @param {string} endpoint - Endpoint that should be requested
 * @param {RequestInit?} options - Optional options like using another http method
 * @returns {Promise<ApiResponse<T>>} The struct of the `T` type
 */
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${getApiBaseUrl()}${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return data as ApiError
    }

    return data as T
  } catch (error) {
    return {
      error: 'Network Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// Core API
// ============================================================================

/**
 * Get version information
 */
export async function getVersion(): Promise<ApiResponse<VersionInfo>> {
  return apiRequest<VersionInfo>('/version')
}

/**
 * List all available API endpoints
 */
export async function listEndpoints(): Promise<ApiResponse<ApiInfo>> {
  return apiRequest<ApiInfo>('')
}

/**
 * List all PipeWire objects (nodes, devices, ports, links, clients, modules, factories)
 */
export async function listObjects(): Promise<ApiResponse<PipewireObjectsList>> {
  return apiRequest<PipewireObjectsList>('/ls')
}

/**
 * Get a single object by its ID
 */
export async function getObjectById(id: number): Promise<ApiResponse<PipewireObject>> {
  return apiRequest<PipewireObject>(`/objects/${id}`)
}

/**
 * Refresh the internal PipeWire object cache
 */
export async function refreshCache(): Promise<ApiResponse<CacheRefreshResponse>> {
  return apiRequest<CacheRefreshResponse>('/cache/refresh', { method: 'POST' })
}

/**
 * Get all objects with their complete property dictionaries
 */
export async function getAllProperties(): Promise<ApiResponse<PipewirePropertiesList>> {
  return apiRequest<PipewirePropertiesList>('/properties')
}

/**
 * Get properties for a specific object
 */
export async function getObjectProperties(id: number): Promise<ApiResponse<PipewireObjectWithProperties>> {
  return apiRequest<PipewireObjectWithProperties>(`/properties/${id}`)
}

// ============================================================================
// Volume API
// ============================================================================

/**
 * List all devices and sinks that have volume control
 */
export async function listVolumes(): Promise<ApiResponse<VolumeInfo[]>> {
  return apiRequest<VolumeInfo[]>('/volume')
}

/**
 * Get volume information for a specific device or sink
 */
export async function getVolumeById(id: number): Promise<ApiResponse<VolumeInfo>> {
  return apiRequest<VolumeInfo>(`/volume/${id}`)
}

/**
 * Set the volume for a specific device or sink
 */
export async function setVolumeById(
  id: number,
  volume: number
): Promise<ApiResponse<VolumeSetResponse>> {
  return apiRequest<VolumeSetResponse>(`/volume/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ volume }),
  })
}

/**
 * Save the current volumes of all devices and sinks
 */
export async function saveAllVolumes(): Promise<ApiResponse<VolumeSaveResponse>> {
  return apiRequest<VolumeSaveResponse>('/volume/save', { method: 'POST' })
}

/**
 * Save the current volume of a specific device or sink
 */
export async function saveVolumeById(id: number): Promise<ApiResponse<VolumeSaveByIdResponse>> {
  return apiRequest<VolumeSaveByIdResponse>(`/volume/save/${id}`, { method: 'POST' })
}

// ============================================================================
// Links API
// ============================================================================

/**
 * List all active PipeWire links
 */
export async function listLinks(): Promise<ApiResponse<LinksList>> {
  return apiRequest<LinksList>('/links')
}

/**
 * Create a link between two ports
 */
export async function createLink(
  output: string,
  input: string
): Promise<ApiResponse<CreateLinkResponse>> {
  return apiRequest<CreateLinkResponse>('/links', {
    method: 'POST',
    body: JSON.stringify({ output, input }),
  })
}

/**
 * Remove a link by its ID
 */
export async function removeLinkById(id: number): Promise<ApiResponse<RemoveLinkResponse>> {
  return apiRequest<RemoveLinkResponse>(`/links/${id}`, { method: 'DELETE' })
}

/**
 * Remove a link by specifying output and input ports
 */
export async function removeLinkByName(
  output: string,
  input: string
): Promise<ApiResponse<RemoveLinkResponse>> {
  return apiRequest<RemoveLinkResponse>('/links/by-name', {
    method: 'DELETE',
    body: JSON.stringify({ output, input }),
  })
}

/**
 * Check if a link exists between two ports
 */
export async function linkExists(
  output: string,
  input: string
): Promise<ApiResponse<LinkExistsResponse>> {
  const params = new URLSearchParams({ output, input })
  return apiRequest<LinkExistsResponse>(`/links/exists?${params}`)
}

/**
 * List all available output (playback) ports
 */
export async function listOutputPorts(): Promise<ApiResponse<PortsList>> {
  return apiRequest<PortsList>('/links/ports/output')
}

/**
 * List all available input (capture) ports
 */
export async function listInputPorts(): Promise<ApiResponse<PortsList>> {
  return apiRequest<PortsList>('/links/ports/input')
}

// ============================================================================
// Graph API
// ============================================================================

/**
 * Get audio topology in DOT format
 */
export async function getGraphDot(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/graph`)
  return response.text()
}

/**
 * Get audio topology as PNG image
 */
export async function getGraphPng(): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/graph/png`)
  return response.blob()
}

// ============================================================================
// SpeakerEQ Module API
// ============================================================================

const SPEAKEREQ_BASE = '/module/speakereq'

/**
 * Get the overall structure of the SpeakerEQ plugin
 */
export async function getSpeakerEQStructure(): Promise<ApiResponse<SpeakerEQStructure>> {
  return apiRequest<SpeakerEQStructure>(`${SPEAKEREQ_BASE}/structure`)
}

/**
 * Get the number of inputs and outputs
 */
export async function getSpeakerEQIO(): Promise<ApiResponse<SpeakerEQIO>> {
  return apiRequest<SpeakerEQIO>(`${SPEAKEREQ_BASE}/io`)
}

/**
 * Get the plugin configuration (dynamically discovered)
 */
export async function getSpeakerEQConfig(): Promise<ApiResponse<SpeakerEQConfig>> {
  return apiRequest<SpeakerEQConfig>(`${SPEAKEREQ_BASE}/config`)
}

/**
 * Get the complete status of the SpeakerEQ plugin
 */
export async function getSpeakerEQStatus(): Promise<ApiResponse<SpeakerEQStatus>> {
  return apiRequest<SpeakerEQStatus>(`${SPEAKEREQ_BASE}/status`)
}

/**
 * Get a specific EQ band configuration
 */
export async function getSpeakerEQBand(
  block: string,
  band: number
): Promise<ApiResponse<EQBandResponse>> {
  return apiRequest<EQBandResponse>(`${SPEAKEREQ_BASE}/eq/${block}/${band}`)
}

/**
 * Update a specific EQ band
 */
export async function setSpeakerEQBand(
  block: string,
  band: number,
  config: EQBandUpdateRequest
): Promise<ApiResponse<EQBandUpdateResponse>> {
  return apiRequest<EQBandUpdateResponse>(`${SPEAKEREQ_BASE}/eq/${block}/${band}`, {
    method: 'PUT',
    body: JSON.stringify(config),
  })
}

/**
 * Enable or disable a specific EQ band
 */
export async function setSpeakerEQBandEnabled(
  block: string,
  band: number,
  enabled: boolean
): Promise<ApiResponse<EQBandEnabledResponse>> {
  return apiRequest<EQBandEnabledResponse>(`${SPEAKEREQ_BASE}/eq/${block}/${band}/enabled`, {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  })
}

/**
 * Clear all EQ bands in a block
 */
export async function clearSpeakerEQBlock(block: string): Promise<ApiResponse<EQClearResponse>> {
  return apiRequest<EQClearResponse>(`${SPEAKEREQ_BASE}/eq/${block}/clear`, {
    method: 'PUT',
  })
}

/**
 * Get master gain
 */
export async function getSpeakerEQMasterGain(): Promise<ApiResponse<GainResponse>> {
  return apiRequest<GainResponse>(`${SPEAKEREQ_BASE}/gain/master`)
}

/**
 * Set master gain
 */
export async function setSpeakerEQMasterGain(gain: number): Promise<ApiResponse<GainSetResponse>> {
  return apiRequest<GainSetResponse>(`${SPEAKEREQ_BASE}/gain/master`, {
    method: 'PUT',
    body: JSON.stringify({ gain }),
  })
}

/**
 * Get input gain for a specific channel
 */
export async function getSpeakerEQInputGain(channel: number): Promise<ApiResponse<GainResponse>> {
  return apiRequest<GainResponse>(`${SPEAKEREQ_BASE}/gain/input/${channel}`)
}

/**
 * Set input gain for a specific channel
 */
export async function setSpeakerEQInputGain(
  channel: number,
  gain: number
): Promise<ApiResponse<GainSetResponse>> {
  return apiRequest<GainSetResponse>(`${SPEAKEREQ_BASE}/gain/input/${channel}`, {
    method: 'PUT',
    body: JSON.stringify({ gain }),
  })
}

/**
 * Get output gain for a specific channel
 */
export async function getSpeakerEQOutputGain(channel: number): Promise<ApiResponse<GainResponse>> {
  return apiRequest<GainResponse>(`${SPEAKEREQ_BASE}/gain/output/${channel}`)
}

/**
 * Set output gain for a specific channel
 */
export async function setSpeakerEQOutputGain(
  channel: number,
  gain: number
): Promise<ApiResponse<GainSetResponse>> {
  return apiRequest<GainSetResponse>(`${SPEAKEREQ_BASE}/gain/output/${channel}`, {
    method: 'PUT',
    body: JSON.stringify({ gain }),
  })
}

/**
 * Get all delay values
 */
export async function getSpeakerEQDelays(): Promise<ApiResponse<DelaysResponse>> {
  return apiRequest<DelaysResponse>(`${SPEAKEREQ_BASE}/delay`)
}

/**
 * Set delay for a specific channel
 */
export async function setSpeakerEQDelay(
  channel: number,
  ms: number
): Promise<ApiResponse<DelaySetResponse>> {
  return apiRequest<DelaySetResponse>(`${SPEAKEREQ_BASE}/delay/${channel}`, {
    method: 'PUT',
    body: JSON.stringify({ ms }),
  })
}

/**
 * Get the crossbar routing matrix
 */
export async function getSpeakerEQCrossbar(): Promise<ApiResponse<CrossbarMatrix>> {
  return apiRequest<CrossbarMatrix>(`${SPEAKEREQ_BASE}/crossbar`)
}

/**
 * Set the entire crossbar routing matrix
 */
export async function setSpeakerEQCrossbarMatrix(matrix: number[][]): Promise<ApiResponse<CrossbarMatrix>> {
  return apiRequest<CrossbarMatrix>(`${SPEAKEREQ_BASE}/crossbar`, {
    method: 'PUT',
    body: JSON.stringify({ matrix }),
  })
}

/**
 * Set a single crossbar routing value
 */
export async function setSpeakerEQCrossbar(
  input: number,
  output: number,
  value: number
): Promise<ApiResponse<CrossbarSetResponse>> {
  return apiRequest<CrossbarSetResponse>(`${SPEAKEREQ_BASE}/crossbar/${input}/${output}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  })
}

/**
 * Get enable status
 */
export async function getSpeakerEQEnabled(): Promise<ApiResponse<EnableStatusResponse>> {
  return apiRequest<EnableStatusResponse>(`${SPEAKEREQ_BASE}/enable`)
}

/**
 * Set enable status
 */
export async function setSpeakerEQEnabled(enabled: boolean): Promise<ApiResponse<EnableSetResponse>> {
  return apiRequest<EnableSetResponse>(`${SPEAKEREQ_BASE}/enable`, {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  })
}

/**
 * Refresh parameter cache
 */
export async function refreshSpeakerEQCache(): Promise<ApiResponse<RefreshResponse>> {
  return apiRequest<RefreshResponse>(`${SPEAKEREQ_BASE}/refresh`, { method: 'POST' })
}

/**
 * Reset all parameters to default values
 */
export async function resetSpeakerEQToDefaults(): Promise<ApiResponse<DefaultResponse>> {
  return apiRequest<DefaultResponse>(`${SPEAKEREQ_BASE}/default`, { method: 'POST' })
}

/**
 * Get license status
 */
export async function getSpeakerEQLicense(): Promise<ApiResponse<LicenseResponse>> {
  return apiRequest<LicenseResponse>(`${SPEAKEREQ_BASE}/license`)
}

// ============================================================================
// RIAA Module API
// ============================================================================

const RIAA_BASE = '/module/riaa'

/**
 * Get complete RIAA configuration
 */
export async function getRIAAConfig(): Promise<ApiResponse<RIAAConfig>> {
  return apiRequest<RIAAConfig>(`${RIAA_BASE}/config`)
}

/**
 * Get RIAA gain
 */
export async function getRIAAGain(): Promise<ApiResponse<RIAAGainResponse>> {
  return apiRequest<RIAAGainResponse>(`${RIAA_BASE}/gain`)
}

/**
 * Set RIAA gain
 */
export async function setRIAAGain(gain_db: number): Promise<ApiResponse<RIAAGainSetResponse>> {
  return apiRequest<RIAAGainSetResponse>(`${RIAA_BASE}/gain`, {
    method: 'PUT',
    body: JSON.stringify({ gain_db }),
  })
}

/**
 * Get subsonic filter setting
 */
export async function getRIAASubsonic(): Promise<ApiResponse<RIAASubsonicResponse>> {
  return apiRequest<RIAASubsonicResponse>(`${RIAA_BASE}/subsonic`)
}

/**
 * Set subsonic filter (0=Off, 1=20Hz, 2=30Hz, 3=40Hz)
 */
export async function setRIAASubsonic(filter: number): Promise<ApiResponse<RIAASubsonicSetResponse>> {
  return apiRequest<RIAASubsonicSetResponse>(`${RIAA_BASE}/subsonic`, {
    method: 'PUT',
    body: JSON.stringify({ filter }),
  })
}

/**
 * Get RIAA enable status
 */
export async function getRIAAEnabled(): Promise<ApiResponse<RIAAEnableResponse>> {
  return apiRequest<RIAAEnableResponse>(`${RIAA_BASE}/riaa-enable`)
}

/**
 * Enable or disable RIAA equalization
 */
export async function setRIAAEnabled(enabled: boolean): Promise<ApiResponse<RIAAEnableSetResponse>> {
  return apiRequest<RIAAEnableSetResponse>(`${RIAA_BASE}/riaa-enable`, {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  })
}

/**
 * Get declicker enable status
 */
export async function getRIAADeclick(): Promise<ApiResponse<RIAAEnableResponse>> {
  return apiRequest<RIAAEnableResponse>(`${RIAA_BASE}/declick`)
}

/**
 * Enable or disable declicker
 */
export async function setRIAADeclick(enabled: boolean): Promise<ApiResponse<RIAAEnableSetResponse>> {
  return apiRequest<RIAAEnableSetResponse>(`${RIAA_BASE}/declick`, {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  })
}

/**
 * Get spike detection configuration
 */
export async function getRIAASpike(): Promise<ApiResponse<RIAASpikeResponse>> {
  return apiRequest<RIAASpikeResponse>(`${RIAA_BASE}/spike`)
}

/**
 * Set spike detection configuration
 */
export async function setRIAASpike(
  threshold_db: number,
  width_ms: number
): Promise<ApiResponse<RIAASpikeSetResponse>> {
  return apiRequest<RIAASpikeSetResponse>(`${RIAA_BASE}/spike`, {
    method: 'PUT',
    body: JSON.stringify({ threshold_db, width_ms }),
  })
}

/**
 * Get notch filter configuration
 */
export async function getRIAANotch(): Promise<ApiResponse<RIAANotchResponse>> {
  return apiRequest<RIAANotchResponse>(`${RIAA_BASE}/notch`)
}

/**
 * Set notch filter configuration
 */
export async function setRIAANotch(
  enabled: boolean,
  frequency_hz: number,
  q_factor: number
): Promise<ApiResponse<RIAANotchSetResponse>> {
  return apiRequest<RIAANotchSetResponse>(`${RIAA_BASE}/notch`, {
    method: 'PUT',
    body: JSON.stringify({ enabled, frequency_hz, q_factor }),
  })
}

/**
 * Reset RIAA parameters to defaults
 */
export async function resetRIAAToDefaults(): Promise<ApiResponse<DefaultResponse>> {
  return apiRequest<DefaultResponse>(`${RIAA_BASE}/set-default`, { method: 'PUT' })
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if an API response is an error
 */
export { isApiError }
