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
        <div v-for="player in players" :key="player.name" class="card">
          <div class="player-item" :class="{ expanded: isConfigExpanded(players.indexOf(player)) }">
            <div class="player-main">
              <div class="player-info">
                <AppIcon :icon="player.icon" class="player-icon" />
                <div class="player-details">
                  <h3>{{ player.name }} ({{ player.providedBy }})</h3>
                </div>
              </div>
              <div class="player-actions">
                <div class="player-toggle">
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      :checked="player.enabled"
                      @change="togglePlayer(players.indexOf(player))"
                    >
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <!-- Caret column for expandable services -->
                <div class="player-expand">
                  <div v-if="player.name === 'Airplay' && typeof player.config === 'object'"
                       class="expand-caret"
                       @click="toggleConfigExpanded(players.indexOf(player))">
                    <AppIcon :icon="'caret-down'" class="config-caret" :class="{ expanded: isConfigExpanded(players.indexOf(player)) }" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Configuration section that expands the whole card -->
            <div v-if="player.name === 'Airplay' && typeof player.config === 'object'" class="config-section">
              <div v-if="isConfigExpanded(players.indexOf(player))" class="config-content">
                <div class="config-form">
                  <label class="config-option">
                    Airplay version:
                    <select
                      :value="(player.config as Record<string, number>).airplayVersion"
                      @change="updateAirplayVersion(players.indexOf(player), parseInt(($event.target as HTMLSelectElement).value))"
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
                    @click="cancelConfig(players.indexOf(player))"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    class="config-btn config-btn--save"
                    @click="saveConfig(players.indexOf(player))"
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
import { ref } from 'vue'
import AppIcon from '@/components/app-icon.vue'
import AppBackRouter from '@/components/app-back-router.vue'

interface Player {
  name: string
  providedBy: string
  systemdService: string
  config: string | Record<string, string | number>
  status: 'active' | 'inactive'
  icon: string
  enabled: boolean
}

const players: Player[] = [
  {
    name: 'Local music',
    providedBy: 'mpd',
    systemdService: 'mpd',
    config: 'none',
    status: 'active',
    icon: 'mpd',
    enabled: true
  },
  {
    name: 'Roon',
    providedBy: 'raat',
    systemdService: 'mpd',
    config: 'none',
    status: 'inactive',
    icon: 'roon',
    enabled: false
  },
  {
    name: 'Airplay',
    providedBy: 'shairport express',
    systemdService: 'shairport',
    config: { airplayVersion: 2 },
    status: 'inactive',
    icon: 'airplay',
    enabled: false
  },
  {
    name: 'Spotify',
    providedBy: 'librespot',
    systemdService: 'librespot',
    config: 'none',
    status: 'inactive',
    icon: 'spotify',
    enabled: false
  },
  {
    name: 'LMS',
    providedBy: 'squeezelite',
    systemdService: 'squeezelite',
    config: 'none',
    status: 'inactive',
    icon: 'squeezelite',
    enabled: false
  }
]

// State for tracking which config sections are expanded
const expandedConfigs = ref<Set<number>>(new Set())

const togglePlayer = (playerIndex: number) => {
  players[playerIndex].enabled = !players[playerIndex].enabled
  // Here you would typically make an API call to enable/disable the service
  console.log(`${players[playerIndex].name} ${players[playerIndex].enabled ? 'enabled' : 'disabled'}`)
}

const updateAirplayVersion = (playerIndex: number, version: number) => {
  if (players[playerIndex].name === 'Airplay' && typeof players[playerIndex].config === 'object') {
    (players[playerIndex].config as Record<string, number>).airplayVersion = version
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
  console.log(`Configuration cancelled for ${players[playerIndex].name}`)
}

const saveConfig = (playerIndex: number) => {
  // Save the configuration and close the section
  expandedConfigs.value.delete(playerIndex)
  console.log(`Configuration saved for ${players[playerIndex].name}`)
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
            margin: 0;
            color: var(--color-head);
            font-size: 1.125rem;
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
    }
  }
}
</style>
