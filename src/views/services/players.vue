<template>
  <PageContent title="Players" :backrouterLink="{ name: 'services' }">
    <div class="players-content">
      <div class="players-header">
        <p>Manage and configure your audio players. We recommend that you only enable services that you regularly use.</p>
      </div>
      <div class="players-list">
        <PlayerCard
          v-for="player in visiblePlayers"
          :key="player.name"
          :player="player"
          :is-expanded="isConfigExpanded(player.name)"
          @toggle="handleToggleClick($event, player.name)"
          @toggle-config="toggleConfigExpanded(player.name)"
          @navigate-bluetooth="goToBluetoothSettings"
          @update-airplay-version="(version) => updateAirplayVersion(player.name, version)"
          @update-toslink-sensitivity="(sensitivity) => updateTOSLinkSensitivity(player.name, sensitivity)"
          @cancel-config="cancelConfig(player.name)"
          @save-config="saveConfig(player.name)"
        />
      </div>
    </div>
  </PageContent>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PlayerCard from '@/components/PlayerCard.vue'
import PageContent from '@/components/PageContent.vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'

const router = useRouter()
const settingsStore = useSettingsStore()
const { getExpertMode } = storeToRefs(settingsStore)

const goToBluetoothSettings = () => {
  router.push('/services/bluetooth-settings')
}

import {
  getMultipleServiceStatus,
  enableNowService,
  disableNowService,
  checkSystemdServiceExists
} from '@/api/config'
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
    name: 'Airplay',
    providedBy: 'shairport express',
    systemdService: 'shairport',
    config: { airplayVersion: 2 },
    status: 'inactive',
    icon: 'airplay',
    enabled: false,
    loading: false,
    error: undefined,
    allow_change: true,
    exists: true
  },
  {
    name: 'Spotify',
    providedBy: 'librespot',
    systemdService: 'librespot',
    config: 'none',
    status: 'inactive',
    icon: 'spotify',
    enabled: false,
    loading: false,
    error: undefined,
    allow_change: true,
    exists: true
  },
  {
    name: 'LMS',
    providedBy: 'squeezelite',
    systemdService: 'squeezelite',
    config: 'none',
    status: 'inactive',
    icon: 'squeezelite',
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
  providedBy: 'hbos-bluetooth',
  systemdService: 'hbos-bluetooth.service',
  config: 'none',
  status: 'inactive',
  icon: 'bluetooth',
  enabled: false,
  loading: false,
  error: undefined,
  allow_change: true,
  exists: true
  }
])

// Filter out non-installed players unless in expert mode
const visiblePlayers = computed(() => {
  console.log('[visiblePlayers] Expert mode:', getExpertMode.value)
  console.log('[visiblePlayers] All players:', players.value.map(p => ({ name: p.name, exists: p.exists })))

  if (getExpertMode.value) {
    console.log('[visiblePlayers] Showing all players (expert mode enabled)')
    return players.value
  }

  const filtered = players.value.filter(player => player.exists !== false)
  console.log('[visiblePlayers] Filtered players:', filtered.map(p => p.name))
  return filtered
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

const loadServiceStatus = async () => {
  try {
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

const handleToggleClick = async (event: Event, playerName: string) => {
  // Prevent the default checkbox behavior
  event.preventDefault()

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
  const isActive = player.status === 'active'

  try {
    if (isActive) {
      // Disable and stop the service
      await disableNowService(player.systemdService)
    } else {
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

const updateTOSLinkSensitivity = (playerName: string, sensitivity: string) => {
  const playerIndex = findPlayerIndex(playerName)
  if (playerIndex === -1) return

  const player = players.value[playerIndex]
  if (player.name === 'TOSLink' && typeof player.config === 'object') {
    (player.config as Record<string, string>).inputSensitivity = sensitivity
    console.log(`TOSLink input sensitivity updated to ${sensitivity}`)
  }
}

const toggleConfigExpanded = (playerName: string) => {
  const playerIndex = findPlayerIndex(playerName)
  if (playerIndex === -1) return

  if (expandedConfigs.value.has(playerIndex)) {
    expandedConfigs.value.delete(playerIndex)
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
  expandedConfigs.value.delete(playerIndex)
  const player = players.value[playerIndex]
  console.log(`Configuration cancelled for ${player.name}`)
}

const saveConfig = async (playerName: string) => {
  const playerIndex = findPlayerIndex(playerName)
  if (playerIndex === -1) return

  // Save the configuration and close the section
  expandedConfigs.value.delete(playerIndex)
  const player = players.value[playerIndex]
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
</style>
