<template>
  <div class="card">
    <div class="player-item" :class="{
      expanded: isExpanded,
      'not-installed': player.exists === false
    }">
      <div class="player-main">
        <div class="player-info">
          <inline-svg v-if="player.iconUrl" :src="player.iconUrl" class="player-icon" :width="24" :height="24" />
          <Icon v-else :icon="player.icon" class="player-icon" />
          <div class="player-details">
            <h3>{{ player.name }} ({{ player.providedBy }})</h3>
            <div class="player-status">
              <span :class="['status-badge', getStatusClass(player)]">
                {{ getStatusText(player) }}
              </span>
            </div>
            <div v-if="player.error" class="player-error">
              <span class="error-message">{{ player.error }}</span>
            </div>
          </div>
        </div>
        <div class="player-actions">
          <div class="player-toggle">
            <ToggleSwitch
              :model-value="player.status === 'active'"
              :disabled="player.loading || player.allow_change === false || player.exists === false"
              :loading="player.loading"
              @update:model-value="$emit('toggle')"
            />
          </div>
          <!-- Caret column for expandable services -->
          <div class="player-expand">
            <div v-if="hasConfig"
                 class="expand-caret"
                 @click="$emit('toggle-config')">
              <Icon :icon="'caret-down'" class="config-caret" :class="{ expanded: isExpanded }" />
            </div>

            <!-- Bluetooth button -->
            <div v-if="player.name === 'Bluetooth'"
                 class="expand-caret"
                 @click="$emit('navigate-bluetooth')">
              <Icon icon="caret-down" class="config-caret" />
            </div>
          </div>
        </div>
      </div>

      <!-- Configuration section that expands the whole card -->
      <div v-if="player.name === 'Airplay' && typeof player.config === 'object'" class="config-section">
        <div v-if="isExpanded" class="config-content">
          <div class="config-form">
            <label class="config-option">
              Airplay version:
              <select
                :value="(player.config as Record<string, number>).airplayVersion"
                @change="$emit('update-airplay-version', parseInt(($event.target as HTMLSelectElement).value))"
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
              @click="$emit('cancel-config')"
              type="button"
            >
              Cancel
            </button>
            <button
              class="config-btn config-btn--save"
              @click="$emit('save-config')"
              type="button"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      <!-- TOSLink Configuration section that expands the whole card -->
      <div v-if="player.name === 'TOSLink' && typeof player.config === 'object'" class="config-section">
        <div v-if="isExpanded" class="config-content">
          <div class="config-form">
            <label class="config-option">
              Input sensitivity:
              <select
                :value="(player.config as Record<string, string>).inputSensitivity"
                @change="$emit('update-toslink-sensitivity', ($event.target as HTMLSelectElement).value)"
                class="version-select"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          <div class="config-actions">
            <button
              class="config-btn config-btn--cancel"
              @click="$emit('cancel-config')"
              type="button"
            >
              Cancel
            </button>
            <button
              class="config-btn config-btn--save"
              @click="$emit('save-config')"
              type="button"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'
import InlineSvg from 'vue-inline-svg'
import ToggleSwitch from '@/components/ToggleSwitch.vue'

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
}

const props = defineProps<{
  player: Player
  isExpanded: boolean
}>()

defineEmits<{
  toggle: []
  'toggle-config': []
  'navigate-bluetooth': []
  'update-airplay-version': [version: number]
  'update-toslink-sensitivity': [sensitivity: string]
  'cancel-config': []
  'save-config': []
}>()

const hasConfig = computed(() => {
  return (props.player.name === 'Airplay' || props.player.name === 'TOSLink') &&
         typeof props.player.config === 'object'
})

const getStatusClass = (player: Player) => {
  if (player.exists === false) return 'gray'
  if (player.status === 'active') return 'green'
  if (player.status === 'failed') return 'red'
  return 'gray'
}

const getStatusText = (player: Player) => {
  if (player.exists === false) return 'Not installed'
  return player.status
}
</script>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;

.card {
  @include service-card-base;
}

.player-item {
  @include service-item-base;

  .player-main {
    @include service-main-layout;
  }

  &.expanded {
    @include service-expanded-state;
  }

  .player-info {
    @include service-info-layout;

    .player-icon {
      @include service-icon-base;
    }

    .player-details {
      @include service-details-base;

      .player-status {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 4px;
      }

      .player-error {
        margin-top: 4px;

        .error-message {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75em;
          font-weight: 600;
          background-color: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }
      }
    }
  }

  .player-actions {
    @include service-actions-base;

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

  }

  .config-section {
    width: 100%;

    .config-content {
      @include service-content-box;

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
          &--cancel {
            @include service-button-secondary;
            min-width: 80px;
          }

          &--save {
            @include service-button-primary;
            min-width: 80px;
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
</style>
