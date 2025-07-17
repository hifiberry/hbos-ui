<template>
  <div class="players">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'services' }">Players</AppBackRouter>
    </div>

    <div class="players-content">
      <div class="players-header">
        <h2>Audio Players</h2>
        <p>Manage and configure your audio players. We recommend that you only enable services that you regularly use.</p>
      </div>

      <div class="players-list">
        <div v-for="(player, index) in players" :key="player.name" class="card">
          <div class="player-item" :class="{
            expanded: isConfigExpanded(index),
            'not-installed': player.exists === false
          }">
            <div class="player-main">
              <div class="player-info">
                <AppIcon :icon="player.icon" class="player-icon" />
                <div class="player-details">
                  <h3>{{ player.name }} ({{ player.providedBy }})</h3>
                  <div class="player-status">
                    <span :class="['status-badge', player.exists === false ? 'not-installed' : player.status]">
                      {{ player.exists === false ? 'Not installed' : player.status }}
                    </span>
                  </div>
                  <div v-if="player.error" class="player-error">
                    <span class="error-message">{{ player.error }}</span>
                  </div>
                </div>
              </div>
              <div class="player-actions">
                <div class="player-toggle">
                  <label class="toggle-switch" :class="{
                    'disabled': player.allow_change === false || player.exists === false
                  }">
                    <input
                      type="checkbox"
                      :checked="player.enabled"
                      :disabled="player.loading || player.allow_change === false || player.exists === false"
                      @click="handleToggleClick($event, index)"
                    >
                    <span class="toggle-slider" :class="{
                      loading: player.loading,
                      'not-allowed': player.allow_change === false || player.exists === false
                    }"></span>
                  </label>
                </div>
                <!-- Caret column for expandable services -->
                <div class="player-expand">
                  <div v-if="player.name === 'Airplay' && typeof player.config === 'object'"
                       class="expand-caret"
                       @click="toggleConfigExpanded(index)">
                    <AppIcon :icon="'caret-down'" class="config-caret" :class="{ expanded: isConfigExpanded(index) }" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Configuration section that expands the whole card -->
            <div v-if="player.name === 'Airplay' && typeof player.config === 'object'" class="config-section">
              <div v-if="isConfigExpanded(index)" class="config-content">
                <div class="config-form">
                  <label class="config-option">
                    Airplay version:
                    <select
                      :value="(player.config as Record<string, number>).airplayVersion"
                      @change="updateAirplayVersion(index, parseInt(($event.target as HTMLSelectElement).value))"
                      class="version-select"
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                    </select>
                  </label>
                </div>
                <div class="config-actions">
                  <button
                    class="config-btn config-btn--cancel"
                    @click="cancelConfig(index)"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    class="config-btn config-btn--save"
                    @click="saveConfig(index)"
                    type="button"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/app-icon.vue'
import AppBackRouter from '@/components/app-back-router.vue'
import {
  getMultipleServiceStatus,
  enableService,
  disableService,
  checkSystemdServiceExists
} from '@/api/config'

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
  }
])

// State for tracking which config sections are expanded
const expandedConfigs = ref<Set<number>>(new Set())

// Load service status on component mount
onMounted(async () => {
  await loadServiceStatus()
})

const loadServiceStatus = async () => {
  try {
    const serviceNames = players.value.map(p => p.systemdService)

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

    players.value.forEach(player => {
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

const handleToggleClick = async (event: Event, playerIndex: number) => {
  // Prevent the default checkbox behavior
  event.preventDefault()

  const player = players.value[playerIndex]
  if (player.loading) return

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
  const wasEnabled = player.enabled

  try {
    if (wasEnabled) {
      // Disable the service (stops and disables)
      await disableService(player.systemdService)
    } else {
      // Enable the service (enables and starts)
      await enableService(player.systemdService)
    }

    console.log(`${player.name} ${player.enabled ? 'enabled' : 'disabled'}`)
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

const updateAirplayVersion = (playerIndex: number, version: number) => {
  const player = players.value[playerIndex]
  if (player.name === 'Airplay' && typeof player.config === 'object') {
    (player.config as Record<string, number>).airplayVersion = version
    console.log(`Airplay version updated to ${version}`)
  }
}

const toggleConfigExpanded = (playerIndex: number) => {
  if (expandedConfigs.value.has(playerIndex)) {
    expandedConfigs.value.delete(playerIndex)
  } else {
    expandedConfigs.value.add(playerIndex)
  }
}

const isConfigExpanded = (playerIndex: number) => {
  return expandedConfigs.value.has(playerIndex)
}

const cancelConfig = (playerIndex: number) => {
  // Close the configuration section without saving changes
  expandedConfigs.value.delete(playerIndex)
  const player = players.value[playerIndex]
  console.log(`Configuration cancelled for ${player.name}`)
}

const saveConfig = (playerIndex: number) => {
  // Save the configuration and close the section
  expandedConfigs.value.delete(playerIndex)
  const player = players.value[playerIndex]
  console.log(`Configuration saved for ${player.name}`)
  // Here you would typically make an API call to save the configuration
}
</script>

<style scoped lang="scss">
.players {
  .breadcrumbs {
    margin-bottom: 32px;
  }

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
    .card {
      margin-bottom: 24px;
    }

    .player-item {
      display: flex;
      flex-direction: column;
      padding: 24px 32px 24px 20px;
      transition: all 0.3s ease;

      .player-main {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 16px;
      }

      &.expanded {
        .player-main {
          margin-bottom: 16px;
        }
      }

      @media (max-width: 768px) {
        padding: 20px;

        .player-main {
          flex-direction: row;
          align-items: center;
          gap: 16px;
        }
      }

      .player-info {
        display: flex;
        align-items: center;
        gap: 28px;
        flex: 1;

        .player-icon {
          width: 40px;
          height: 40px;
          color: var(--color-icon-primary);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;

          :deep(svg) {
            width: 28px;
            height: 28px;
            object-fit: contain;
          }
        }

        .player-details {
          flex: 1;

          h3 {
            margin: 0 0 4px 0;
            color: var(--color-head);
            font-size: 1.125rem;
          }

          .player-status {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 4px;

            .status-badge {
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 500;
              text-transform: capitalize;

              &.active {
                background-color: #e6f7e6;
                color: #2d7d2d;
              }

              &.inactive {
                background-color: #f5f5f5;
                color: #666;
              }

              &.failed {
                background-color: #ffe6e6;
                color: #d51007;
              }

              &.not-installed {
                background-color: #f8f8f8;
                color: #999;
              }
            }
          }

          .player-error {
            margin-top: 4px;

            .error-message {
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 500;
              background-color: #ffe6e6;
              color: #d51007;
            }
          }
        }
      }

      .player-actions {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 16px;

        .player-toggle {
          display: flex;
          align-items: center;
        }

        .player-expand {
          width: 32px;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-shrink: 0;

          .expand-caret {
            cursor: pointer;
            padding: 8px;
            border-radius: 4px;
            transition: background-color 0.2s ease;

            &:hover {
              background: var(--cover-placeholder-bg);
            }

            .config-caret {
              width: 16px;
              height: 16px;
              color: var(--color-body-secondary);
              transition: transform 0.2s ease, color 0.2s ease;

              &.expanded {
                transform: rotate(180deg);
              }
            }

            &:hover .config-caret {
              color: var(--color-head);
            }
          }
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          cursor: pointer;

          input {
            opacity: 0;
            width: 0;
            height: 0;
          }

          .toggle-slider {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--color-body-secondary);
            transition: 0.3s;
            border-radius: 24px;

            &.loading {
              opacity: 0.6;
            }

            &:before {
              position: absolute;
              content: "";
              height: 18px;
              width: 18px;
              left: 3px;
              bottom: 3px;
              background-color: white;
              transition: 0.3s;
              border-radius: 50%;
            }
          }

          input:checked + .toggle-slider {
            background-color: var(--primary);
          }

          input:checked + .toggle-slider:before {
            transform: translateX(20px);
          }

          input:focus + .toggle-slider {
            box-shadow: 0 0 1px var(--primary);
          }

          &.disabled {
            cursor: not-allowed;
            opacity: 0.6;

            .toggle-slider {
              background-color: #e5e5e5;
              cursor: not-allowed;

              &.not-allowed {
                background-color: #f0f0f0;
              }

              &:before {
                background-color: #d0d0d0;
              }
            }

            input:checked + .toggle-slider {
              background-color: #c0c0c0;

              &:before {
                background-color: #a0a0a0;
              }
            }
          }
        }
      }

      .config-section {
        width: 100%;

        .config-content {
          padding: 16px;
          background: var(--background-card);

          .config-form {
            margin-bottom: 16px;
          }

          .config-option {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 0.875rem;
            color: var(--color-body-secondary);

            .version-select {
              padding: 12px 16px;
              border: 1px solid var(--color-sidebar-border);
              border-radius: 6px;
              background: var(--background-card);
              color: var(--color-body-secondary);
              font-size: 1rem;
              font-family: inherit;
              cursor: pointer;
              min-width: 80px;
              height: 44px;

              &:focus {
                outline: none;
                border-color: var(--primary);
                color: var(--color-head);
                box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
              }

              &:hover {
                border-color: var(--color-head);
                color: var(--color-head);
              }
            }
          }

          .config-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            padding-top: 16px;

            .config-btn {
              padding: 8px 16px;
              border-radius: 6px;
              font-size: 0.875rem;
              font-family: inherit;
              cursor: pointer;
              transition: all 0.2s ease;
              border: 1px solid transparent;
              min-width: 80px;

              &--cancel {
                background: transparent;
                color: var(--color-body-secondary);
                border-color: var(--color-sidebar-border);

                &:hover {
                  background: var(--cover-placeholder-bg);
                  color: var(--color-head);
                  border-color: var(--color-head);
                }

                &:focus {
                  outline: none;
                  box-shadow: 0 0 0 2px rgba(var(--color-head-rgb), 0.1);
                }
              }

              &--save {
                background: var(--primary);
                color: white;
                border-color: var(--primary);

                &:hover {
                  background: var(--primary-dark, var(--primary));
                  border-color: var(--primary-dark, var(--primary));
                }

                &:focus {
                  outline: none;
                  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.3);
                }
              }
            }
          }
        }
      }

      &.not-installed {
        opacity: 0.6;

        .player-icon {
          color: #999;
        }

        .player-details h3 {
          color: #999;
        }
      }
    }
  }
}
</style>
