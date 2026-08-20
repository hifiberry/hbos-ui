<template>
  <PageContent title="Players" :backrouterLink="{ name: 'services' }">
    <div class="players-content">
      <div class="players-header">
        <p>Manage and configure your audio players. We recommend that you only enable services that you regularly use.</p>
      </div>

      <StatusBlock v-if="conflictNotice" variant="warning" class="players-conflict-notice">
        {{ conflictNotice }}
      </StatusBlock>
      <div class="players-list">
        <PlayerCard
          v-for="player in builtinPlayers"
          :key="player.name"
          :player="player"
          :is-expanded="isConfigExpanded(player.name)"
          @toggle="handleToggleClick(player.name)"
          @toggle-config="toggleConfigExpanded(player.name)"
          @navigate-bluetooth="goToBluetoothSettings"
          @update-airplay-version="(version) => updateAirplayVersion(player.name, version)"
          @update-toslink-sensitivity="(sensitivity) => updateTOSLinkSensitivity(player.name, sensitivity)"
          @cancel-config="cancelConfig(player.name)"
          @save-config="saveConfig(player.name)"
          @update-external-setting="(key, value) => updateExternalSetting(player.name, key, value)"
        />
      </div>
      <template v-if="externalVisiblePlayers.length > 0">
        <div class="section-header">
          <h3>3rd Party Players</h3>
          <p>Additional players provided by community packages.</p>
        </div>
        <div class="players-list">
          <PlayerCard
            v-for="player in externalVisiblePlayers"
            :key="player.name"
            :player="player"
            :is-expanded="isConfigExpanded(player.name)"
            @toggle="handleToggleClick(player.name)"
            @toggle-config="toggleConfigExpanded(player.name)"
            @navigate-bluetooth="goToBluetoothSettings"
            @update-airplay-version="(version) => updateAirplayVersion(player.name, version)"
            @update-toslink-sensitivity="(sensitivity) => updateTOSLinkSensitivity(player.name, sensitivity)"
            @cancel-config="cancelConfig(player.name)"
            @save-config="saveConfig(player.name)"
            @update-external-setting="(key, value) => updateExternalSetting(player.name, key, value)"
          />
        </div>
      </template>
    </div>
  </PageContent>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PlayerCard from '@/components/PlayerCard.vue'
import PageContent from '@/components/PageContent.vue'
import StatusBlock from '@/components/StatusBlock.vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'

const router = useRouter()
const settingsStore = useSettingsStore()
const { getExpertMode } = storeToRefs(settingsStore)

// Explains an automatic change the user did not ask for: enabling one player
// silently switched another off.
const conflictNotice = ref<string | null>(null)

const goToBluetoothSettings = () => {
  router.push('/services/bluetooth-settings')
}

import {
  getMultipleServiceStatus,
  enableNowService,
  disableNowService,
  checkSystemdServiceExists,
  getExternalPlayers,
  saveExternalPlayerSettings
} from '@/api/config'
import type { PlayerSetting } from '@/api/config'
import {
  getTOSLinkStatus,
  enableTOSLink,
  disableTOSLink,
  setTOSLinkSensitivity
} from '@/services/toslink'

interface Player {
  name: string
  providedBy: string
  systemdService: string
  config: string | Record<string, string | number>
  status: 'active' | 'inactive' | 'failed'
  icon: string
  enabled: boolean
  loading?: boolean
  error?: string
  allow_change?: boolean
  exists?: boolean
  isExternal?: boolean
  iconUrl?: string
  maintainerName?: string
  maintainerUrl?: string
  conflictsWith?: string[]
  settings?: import('@/api/config').PlayerSetting[]
}

const players = ref<Player[]>([
  {
    name: 'Local music',
    providedBy: 'mpd',
    systemdService: 'mpd',
    config: 'none',
    status: 'inactive',
    icon: 'mpd',
    enabled: false,
    loading: false,
    error: undefined,
    allow_change: false,
    exists: true
  },
  {
    name: 'Roon',
    providedBy: 'raat',
    systemdService: 'raat',
    config: 'none',
    status: 'inactive',
    icon: 'roon',
    enabled: false,
    loading: false,
    error: undefined,
    allow_change: true,
    exists: true
  },
  {
    name: 'TOSLink',
    providedBy: 'DSP',
    systemdService: 'alsa-toslink',
    config: { inputSensitivity: 'medium' },
    status: 'inactive',
    icon: 'toslink',
    enabled: false,
    loading: false,
    error: undefined,
    allow_change: false,
    exists: false
  },
  {
  name: 'Bluetooth',
  providedBy: 'hifiberry-bluetooth',
  systemdService: 'hifiberry-bluetooth',
  config: 'none',
  status: 'inactive',
  icon: 'tabler/bluetooth',
  enabled: false,
  loading: false,
  error: undefined,
  allow_change: true,
  exists: true
  }
])

// Filter players into built-in and external, hiding non-installed unless expert mode
const builtinPlayers = computed(() => {
  const builtin = players.value.filter(p => !p.isExternal)
  if (getExpertMode.value) return builtin
  return builtin.filter(p => p.exists !== false)
})

const externalVisiblePlayers = computed(() => {
  const external = players.value.filter(p => p.isExternal)
  const filtered = getExpertMode.value ? external : external.filter(p => p.exists !== false)
  return filtered.sort((a, b) => a.name.localeCompare(b.name))
})

// State for tracking which config sections are expanded
const expandedConfigs = ref<Set<number>>(new Set())

// Helper function to find player index by name
const findPlayerIndex = (playerName: string): number => {
  return players.value.findIndex(p => p.name === playerName)
}

// Load service status on component mount
onMounted(async () => {
  await loadServiceStatus()
})

// Fetch external players and merge into the list. Known services are
// updated in place (settings in particular, so a refresh after save picks
// up the server's current is_set) rather than skipped, since re-pushing
// a duplicate player would break findPlayerIndex's by-name lookup.
//
// `onlyServiceName`, when given, restricts the *merge* to that one service:
// the API has no per-player fetch, so the full list is still requested, but
// every other already-known player's `.settings` is left untouched. Without
// this, a post-save refresh would clobber any other external player's open,
// unsaved config panel (including a secret's in-flight `pendingSecret`).
//
// Even the unscoped call (no `onlyServiceName`) must not clobber a player
// whose config panel is currently expanded: it is safe today only because
// its sole caller, `loadServiceStatus`, runs from `onMounted` before any
// panel can be open. Skipping expanded players here makes that safe by
// construction rather than by luck about call sites, so a future poll or
// pull-to-refresh through this same function can't reintroduce the
// cross-player clobbering bug this branch already fixed once.
//
// This guard only applies to the unscoped call. A scoped call (e.g. from
// saveConfig, `refreshExternalPlayers(player.systemdService)`) is an
// explicit request to refresh exactly that one player, and is made while
// that player's own panel is still expanded (it collapses only afterward)
// -- skipping it there would break the "is_set reflects the server" refresh
// the save path depends on. `toMerge` already scopes a named call to just
// that one service, so there is no cross-player risk to guard against here.
const refreshExternalPlayers = async (onlyServiceName?: string) => {
  const externalPlayers = await getExternalPlayers()
  const toMerge = onlyServiceName
    ? externalPlayers.filter(ext => ext.systemd_service === onlyServiceName)
    : externalPlayers
  for (const ext of toMerge) {
    const existingIndex = players.value.findIndex(p => p.systemdService === ext.systemd_service)
    if (existingIndex !== -1) {
      if (!onlyServiceName && expandedConfigs.value.has(existingIndex)) continue
      players.value[existingIndex].settings = ext.settings
      continue
    }
    players.value.push({
      name: ext.name,
      providedBy: ext.provided_by,
      systemdService: ext.systemd_service,
      config: 'none',
      status: 'inactive',
      icon: ext.icon_url,
      enabled: false,
      loading: false,
      error: undefined,
      allow_change: ext.allow_change,
      exists: true,
      isExternal: true,
      iconUrl: ext.icon_url,
      maintainerName: ext.maintainer_name || undefined,
      maintainerUrl: ext.maintainer_url || undefined,
      conflictsWith: ext.conflicts_with ?? [],
      settings: ext.settings
    })
  }
}

const loadServiceStatus = async () => {
  try {
    await refreshExternalPlayers()

    // Handle TOSLink separately
    const toslinkPlayer = players.value.find(p => p.name === 'TOSLink');
    if (toslinkPlayer) {
      const toslinkStatus = await getTOSLinkStatus();
      toslinkPlayer.exists = toslinkStatus.available;
      toslinkPlayer.allow_change = toslinkStatus.allowChange;
      toslinkPlayer.error = toslinkStatus.error;

      // Sync sensitivity setting from hardware to UI config
      if (toslinkStatus.sensitivity && typeof toslinkPlayer.config === 'object') {
        (toslinkPlayer.config as Record<string, string>).inputSensitivity = toslinkStatus.sensitivity;
      }

      // If DSP is not available, make the whole box inactive
      if (!toslinkStatus.available) {
        toslinkPlayer.status = 'inactive';
        toslinkPlayer.enabled = false;
      } else {
        // Status reflects signal detection: active if signal detected, inactive if no signal
        toslinkPlayer.status = toslinkStatus.signalDetected ? 'active' : 'inactive';
        toslinkPlayer.enabled = toslinkStatus.enabled;
      }
    }

    // Handle other services normally
    const regularPlayers = players.value.filter(p => p.name !== 'TOSLink');
    const serviceNames = regularPlayers.map(p => p.systemdService);

    // Check service existence first
    const existencePromises = serviceNames.map(async (serviceName) => {
      try {
        const response = await checkSystemdServiceExists(serviceName)
        return { service: serviceName, exists: response.data?.exists || false }
      } catch (error) {
        console.error(`Failed to check existence for ${serviceName}:`, error)
        return { service: serviceName, exists: false }
      }
    })

    const existenceResults = await Promise.all(existencePromises)
    const existenceMap = new Map(existenceResults.map(r => [r.service, r.exists]))

    // Get status for existing services only
    const existingServices = serviceNames.filter(name => existenceMap.get(name))
    const statusMap = existingServices.length > 0 ?
      await getMultipleServiceStatus(existingServices) :
      new Map()

    regularPlayers.forEach(player => {
      const exists = existenceMap.get(player.systemdService) || false
      player.exists = exists

      if (exists) {
        const status = statusMap.get(player.systemdService)
        if (status) {
          player.status = status.active
          player.enabled = status.enabled === 'enabled'

          // Update allow_change based on allowed operations
          // If the service has start/stop/enable/disable operations, allow changes
          if (status.allowed_operations && status.allowed_operations.length > 0) {
            const canChange = status.allowed_operations.some((op: string) =>
              ['start', 'stop', 'enable', 'disable'].includes(op)
            )
            // Only update if not explicitly set to false in the player definition
            if (player.allow_change !== false) {
              player.allow_change = canChange
            }
          }
        }
      } else {
        // Service doesn't exist - set default values
        player.status = 'inactive'
        player.enabled = false
        player.allow_change = false
      }

      // Clear any previous errors when loading status
      player.error = undefined
    })
  } catch (error) {
    console.error('Failed to load service status:', error)
  }
}

const refreshSingleServiceStatus = async (serviceName: string, playerIndex: number) => {
  try {
    const player = players.value[playerIndex]

    // Handle TOSLink separately
    if (player.name === 'TOSLink') {
      console.log('[refreshSingleServiceStatus] Refreshing TOSLink status...');
      const toslinkStatus = await getTOSLinkStatus();
      console.log('[refreshSingleServiceStatus] TOSLink status received:', toslinkStatus);

      player.exists = toslinkStatus.available;
      player.allow_change = toslinkStatus.allowChange;
      player.error = toslinkStatus.error;

      // Sync sensitivity setting from hardware to UI config
      if (toslinkStatus.sensitivity && typeof player.config === 'object') {
        (player.config as Record<string, string>).inputSensitivity = toslinkStatus.sensitivity;
      }

      // If DSP is not available, make the whole box inactive
      if (!toslinkStatus.available) {
        player.status = 'inactive';
        player.enabled = false;
      } else {
        // Status reflects signal detection: active if signal detected, inactive if no signal
        player.status = toslinkStatus.signalDetected ? 'active' : 'inactive';
        player.enabled = toslinkStatus.enabled;
      }

      console.log('[refreshSingleServiceStatus] TOSLink player updated:', {
        exists: player.exists,
        status: player.status,
        enabled: player.enabled,
        allow_change: player.allow_change,
        error: player.error
      });
      return;
    }

    // Handle other services normally
    // Check if service exists first
    const existenceResponse = await checkSystemdServiceExists(serviceName)
    const exists = existenceResponse.data?.exists || false
    player.exists = exists

    if (exists) {
      const statusMap = await getMultipleServiceStatus([serviceName])
      const status = statusMap.get(serviceName)

      if (status) {
        player.status = status.active
        player.enabled = status.enabled === 'enabled'

        // Update allow_change based on allowed operations
        if (status.allowed_operations && status.allowed_operations.length > 0) {
          const canChange = status.allowed_operations.some((op: string) =>
            ['start', 'stop', 'enable', 'disable'].includes(op)
          )
          // Only update if not explicitly set to false in the player definition
          if (player.allow_change !== false) {
            player.allow_change = canChange
          }
        }
      }
    } else {
      // Service doesn't exist - set default values
      player.status = 'inactive'
      player.enabled = false
      player.allow_change = false
    }
  } catch (error) {
    console.error(`Failed to refresh status for ${serviceName}:`, error)
  }
}

/** Every player that cannot coexist with `player`.
 *
 *  The relation is treated as symmetric on purpose. Only one side of a pair
 *  normally declares the clash -- soloist-wrapper knows about librespot, but
 *  librespot's descriptor predates Soloist and will never mention it -- so
 *  matching in one direction only would enforce the rule when enabling
 *  Soloist and silently skip it when enabling librespot.
 */
const conflictingPlayers = (player: Player): Player[] =>
  players.value.filter((other) => {
    if (other.systemdService === player.systemdService) return false
    return (
      (player.conflictsWith ?? []).includes(other.systemdService) ||
      (other.conflictsWith ?? []).includes(player.systemdService)
    )
  })

/** Turn off anything that conflicts with the player being switched on. */
const disableConflictingPlayers = async (player: Player): Promise<boolean> => {
  const peers = conflictingPlayers(player).filter(
    (other) => other.status === 'active' || other.enabled,
  )
  if (peers.length === 0) return true

  const disabled: string[] = []
  for (const peer of peers) {
    try {
      await disableNowService(peer.systemdService)
      disabled.push(peer.name)
      const peerIndex = findPlayerIndex(peer.name)
      if (peerIndex !== -1) await refreshSingleServiceStatus(peer.systemdService, peerIndex)
    } catch (error) {
      // Say which one could not be turned off, rather than starting the new
      // player anyway and leaving two Spotify endpoints fighting over the
      // name. Set it on the player instead of throwing: handleToggleClick's
      // catch flattens every exception to "Failed to change service state".
      console.error(`Failed to disable conflicting player ${peer.name}:`, error)
      player.error = `Could not disable ${peer.name}, which cannot run at the same time`
      return false
    }
  }

  if (disabled.length > 0) {
    conflictNotice.value =
      `Disabled ${disabled.join(', ')}: only one of these players can run at a time.`
  }
  return true
}

const handleToggleClick = async (playerName: string) => {
  const playerIndex = findPlayerIndex(playerName)
  if (playerIndex === -1) return

  const player = players.value[playerIndex]
  if (player.loading) return

  // Special handling for TOSLink
  if (player.name === 'TOSLink') {
    // Check if changes are allowed for TOSLink
    if (player.allow_change === false) {
      // The error message should already be set by the status check
      return
    }

    player.loading = true
    player.error = undefined // Clear any previous error
    const wasEnabled = player.enabled

    try {
      if (wasEnabled) {
        await disableTOSLink()
      } else {
        await enableTOSLink()
      }

      console.log(`TOSLink ${!wasEnabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      console.error(`Failed to toggle TOSLink:`, error)
      player.error = error instanceof Error ? error.message : 'Failed to change TOSLink state'
    } finally {
      // Small delay to ensure DSP memory write has taken effect
      if (player.name === 'TOSLink') {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Always refresh the service status after any operation
      // For TOSLink, refresh using the player index directly since refreshSingleServiceStatus
      // identifies TOSLink by player.name, not by systemdService
      console.log(`[handleToggleClick] Refreshing status for TOSLink (index: ${playerIndex})`);
      await refreshSingleServiceStatus(player.systemdService, playerIndex)
      player.loading = false
    }
    return
  }

  // Handle regular services
  // Check if service exists
  if (player.exists === false) {
    player.error = 'Service is not installed'
    return
  }

  // Check if changes are allowed for this service
  if (player.allow_change === false) {
    player.error = 'This service cannot be changed'
    return
  }

  player.loading = true
  player.error = undefined // Clear any previous error
  conflictNotice.value = null
  const isActive = player.status === 'active'

  try {
    if (isActive) {
      // Disable and stop the service
      await disableNowService(player.systemdService)
    } else {
      // Two players that conflict must not both be left enabled. systemd's
      // Conflicts= only stops them running at the same instant: enabling both
      // leaves both starting at boot, where whichever wins the race stops the
      // other, so the device picks a different Spotify endpoint on different
      // boots. Turn the loser off here, before starting the winner.
      if (!(await disableConflictingPlayers(player))) return

      // Enable and start the service
      await enableNowService(player.systemdService)
    }

    console.log(`${player.name} ${isActive ? 'disabled' : 'enabled'}`)
  } catch (error) {
    console.error(`Failed to toggle ${player.name}:`, error)

    // Check if it's a forbidden error
    if (error instanceof Error && error.message.includes('403')) {
      player.error = 'Not allowed to change the service state'
    } else {
      player.error = 'Failed to change service state'
    }
  } finally {
    // Always refresh the service status after any operation
    // This ensures the UI reflects the actual service state
    await refreshSingleServiceStatus(player.systemdService, playerIndex)
    player.loading = false
  }
}

const updateAirplayVersion = (playerName: string, version: number) => {
  const playerIndex = findPlayerIndex(playerName)
  if (playerIndex === -1) return

  const player = players.value[playerIndex]
  if (player.name === 'Airplay' && typeof player.config === 'object') {
    (player.config as Record<string, number>).airplayVersion = version
    console.log(`Airplay version updated to ${version}`)
  }
}

// Drop any typed-but-unsaved credential text held on a player's settings.
// Called from every path that ends a save attempt (success or failure) and
// from `closeConfig` (Cancel, Save, and caret-collapse all route through
// it), so a plaintext secret never outlives the action that was supposed to
// consume it.
const clearPendingSecrets = (player: Player) => {
  for (const s of player.settings ?? []) {
    delete (s as PlayerSetting & { pendingSecret?: string }).pendingSecret
  }
}

const updateExternalSetting = (playerName: string, key: string, value: boolean | string | number) => {
  const player = players.value[findPlayerIndex(playerName)]
  if (!player?.settings) return
  const setting = player.settings.find(s => s.key === key)
  if (!setting) return
  if (setting.type === 'secret') {
    // Held only until save, and never written into `value` -- a credential
    // must not end up somewhere the rest of the card reads back.
    (setting as PlayerSetting & { pendingSecret?: string }).pendingSecret = String(value)
    return
  }
  setting.value = value
}

const updateTOSLinkSensitivity = (playerName: string, sensitivity: string) => {
  const playerIndex = findPlayerIndex(playerName)
  if (playerIndex === -1) return

  const player = players.value[playerIndex]
  if (player.name === 'TOSLink' && typeof player.config === 'object') {
    (player.config as Record<string, string>).inputSensitivity = sensitivity
    console.log(`TOSLink input sensitivity updated to ${sensitivity}`)
  }
}

// Close a player's config panel and drop any pending secret. This is the
// ONLY place that should remove a player from `expandedConfigs`: routing
// Cancel, Save, and the caret-collapse path all through here keeps the
// invariant on `clearPendingSecrets` below true regardless of which gesture
// the user used to close the panel.
const closeConfig = (playerName: string) => {
  const playerIndex = findPlayerIndex(playerName)
  if (playerIndex === -1) return

  expandedConfigs.value.delete(playerIndex)
  clearPendingSecrets(players.value[playerIndex])
}

const toggleConfigExpanded = (playerName: string) => {
  const playerIndex = findPlayerIndex(playerName)
  if (playerIndex === -1) return

  if (expandedConfigs.value.has(playerIndex)) {
    // The caret is a "never mind" gesture just as much as Cancel: it sits
    // outside the expanded block and is clickable the whole time the panel
    // is open, so collapsing this way must clear any pending secret too.
    closeConfig(playerName)
  } else {
    expandedConfigs.value.add(playerIndex)
  }
}

const isConfigExpanded = (playerName: string) => {
  const playerIndex = findPlayerIndex(playerName)
  if (playerIndex === -1) return false

  return expandedConfigs.value.has(playerIndex)
}

const cancelConfig = (playerName: string) => {
  const playerIndex = findPlayerIndex(playerName)
  if (playerIndex === -1) return

  // Close the configuration section without saving changes
  const player = players.value[playerIndex]
  closeConfig(playerName)
  console.log(`Configuration cancelled for ${player.name}`)
}

const saveConfig = async (playerName: string) => {
  const playerIndex = findPlayerIndex(playerName)
  if (playerIndex === -1) return

  const player = players.value[playerIndex]
  if (player?.isExternal && player.settings?.length) {
    const values: Record<string, boolean | string | number> = {}
    for (const s of player.settings) {
      if (s.type === 'secret') {
        // Only send a secret the user actually touched. An empty string is a
        // deliberate clear and must be sent; undefined means "leave alone".
        const pending = (s as PlayerSetting & { pendingSecret?: string }).pendingSecret
        if (pending !== undefined) values[s.key] = pending
        continue
      }
      if (s.value !== undefined) values[s.key] = s.value
    }
    try {
      await saveExternalPlayerSettings(player.systemdService, values)
      // Refetch so is_set reflects what the server now holds. Scoped to this
      // player only: another external player may have its own config panel
      // open with unsaved edits, and a full-list merge would silently
      // overwrite those.
      await refreshExternalPlayers(player.systemdService)
    } catch (e) {
      player.error = e instanceof Error ? e.message : 'Failed to save settings'
    } finally {
      // Drop the plaintext we were holding whether the save succeeded or
      // failed. `values` above was snapshotted before the request, so
      // clearing here loses nothing that was actually sent -- and if the
      // request failed, the credential must not silently resurface on a
      // later, unrelated save.
      clearPendingSecrets(player)
    }
    closeConfig(playerName)
    return
  }

  // Save the configuration and close the section
  closeConfig(playerName)
  console.log(`Configuration saved for ${player.name}`)

  try {
    // Handle TOSLink sensitivity configuration
    if (player.name === 'TOSLink' && typeof player.config === 'object') {
      const sensitivity = (player.config as Record<string, string>).inputSensitivity as 'low' | 'medium' | 'high';
      console.log(`Saving TOSLink sensitivity: ${sensitivity}`);
      await setTOSLinkSensitivity(sensitivity);
      console.log(`TOSLink sensitivity saved successfully: ${sensitivity}`);
    }
    // Here you would add other configuration saving logic for other services
  } catch (error) {
    console.error(`Failed to save configuration for ${player.name}:`, error);
    // You might want to show an error message to the user here
  }
}
</script>

<style scoped lang="scss">
.players-header {
  margin-bottom: 32px;

  h2 {
    margin: 0 0 8px 0;
    color: var(--color-head);
  }

  p {
    margin: 0;
    color: var(--color-body-secondary);
  }
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  margin-top: 32px;
  margin-bottom: 16px;

  h3 {
    margin: 0 0 4px 0;
    color: var(--color-head);
    font-size: 1.1rem;
  }

  p {
    margin: 0;
    color: var(--color-body-secondary);
    font-size: 0.875rem;
  }
}
</style>
