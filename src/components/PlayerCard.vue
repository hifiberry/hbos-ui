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
            <router-link
              v-if="!player.exists && player.extension_package"
              data-test="install-link"
              class="player-card__install"
              :to="{ name: 'extensions', query: { install: player.extension_package } }"
            >
              Install
            </router-link>
            <button
              v-if="setupIncomplete === true"
              type="button"
              class="player-setup-required"
              data-test="setup-required"
              @click.stop="$emit('toggle-config')"
            >
              {{ needsBinary ? 'Setup required — download and configure' : 'Setup required — add settings' }}
            </button>
            <div v-if="player.maintainerName" class="player-maintainer">
              <a v-if="player.maintainerUrl" :href="player.maintainerUrl" target="_blank" rel="noopener noreferrer" class="maintainer-link">{{ maintainerLabel(player.maintainerName) }}</a>
              <span v-else class="maintainer-name">{{ maintainerLabel(player.maintainerName) }}</span>
            </div>
          </div>
        </div>
        <div class="player-actions">
          <div class="player-toggle">
            <ToggleSwitch
              :model-value="player.providedBy === 'DSP' ? player.enabled : player.status === 'active'"
              :disabled="
                player.loading ||
                player.allow_change === false ||
                player.exists === false ||
                setupIncomplete === true
              "
              :title="setupIncomplete === true ? 'Finish setup before enabling this player' : undefined"
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

      <!-- Generic external-plugin settings -->
      <div v-if="player.isExternal && (player.settings?.length ?? 0) > 0" class="config-section">
        <div v-if="isExpanded" class="config-content">
          <!-- Some players own a one-time installation step of their own --
               Soloist's binary may not be redistributed, so the device fetches
               it on request. The player declares where to drive that from in
               its descriptor; nothing here knows any player by name. -->
          <PlayerSetupPanel
            v-if="player.setup?.base_url"
            :base-url="player.setup.base_url"
            :player-name="player.name"
            :binary-name="player.systemdService"
            :credentials-set="credentialsSet"
            :status="setupStatus"
            @changed="refreshSetup"
          />
          <div class="config-form">
            <template v-for="setting in player.settings" :key="setting.key">
              <label class="config-option" :for="`set-${player.systemdService}-${setting.key}`">
                {{ setting.label }}
              </label>
              <div class="config-control">
                <ToggleSwitch
                  v-if="setting.type === 'toggle'"
                  :id="`set-${player.systemdService}-${setting.key}`"
                  :model-value="setting.value === true"
                  @update:model-value="(v) => $emit('update-external-setting', setting.key, v)"
                />
                <template v-else-if="setting.type === 'number' && setting.widget === 'slider'">
                  <input
                    :id="`set-${player.systemdService}-${setting.key}`"
                    type="range"
                    :value="setting.value"
                    :min="setting.min"
                    :max="setting.max"
                    :step="setting.step"
                    :style="{ '--fill': sliderFill(setting) }"
                    @input="$emit('update-external-setting', setting.key, Number(($event.target as HTMLInputElement).value))"
                    class="slider-input"
                  />
                  <!-- A bare slider hides the number, which matters when the
                       value is meaningful (milliseconds of latency). -->
                  <output class="slider-value">{{ setting.value }}</output>
                </template>
                <input
                  v-else-if="setting.type === 'number'"
                  :id="`set-${player.systemdService}-${setting.key}`"
                  type="number"
                  :value="setting.value"
                  :min="setting.min"
                  :max="setting.max"
                  :step="setting.step"
                  @change="$emit('update-external-setting', setting.key, Number(($event.target as HTMLInputElement).value))"
                  class="number-input"
                />
                <select
                  v-else-if="setting.type === 'select'"
                  :id="`set-${player.systemdService}-${setting.key}`"
                  :value="setting.value"
                  @change="$emit('update-external-setting', setting.key, ($event.target as HTMLSelectElement).value)"
                  class="version-select"
                >
                  <option v-for="opt in setting.options" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <div
                  v-else-if="setting.type === 'secret'"
                  class="secret-field"
                >
                  <input
                    :id="`set-${player.systemdService}-${setting.key}`"
                    type="password"
                    autocomplete="off"
                    spellcheck="false"
                    :placeholder="setting.is_set ? '••••••••  (stored)' : 'Paste your key'"
                    @input="$emit('update-external-setting', setting.key,
                                  ($event.target as HTMLInputElement).value)"
                  />
                  <span class="secret-state">{{ setting.is_set ? 'Set' : 'Not set' }}</span>
                  <button
                    v-if="setting.is_set"
                    type="button"
                    class="secret-clear"
                    :data-test="`clear-secret-${setting.key}`"
                    @click="$emit('update-external-setting', setting.key, '')"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <p v-if="setting.description" class="config-description">{{ setting.description }}</p>
            </template>
          </div>
          <div class="config-actions">
            <button class="config-btn config-btn--cancel" @click="$emit('cancel-config')" type="button">Cancel</button>
            <button class="config-btn config-btn--save" @click="$emit('save-config')" type="button">Save</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PlayerSetupPanel from '@/components/PlayerSetupPanel.vue'
import { usePlayerSetup } from '@/composables/usePlayerSetup'
import Icon from '@/components/Icon.vue'
import InlineSvg from 'vue-inline-svg'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import type { PlayerSetting } from '@/api/config'

/** Fraction of the range already covered, as a CSS percentage.
 *  WebKit cannot paint a filled portion on its own, so the track uses this to
 *  draw one with a gradient. Only called for type === 'number', which always
 *  carries a value; `value` is typed optional here only because it is shared
 *  with the `secret` variant, which never reaches this helper. */
const sliderFill = (setting: { value?: boolean | string | number; min?: number; max?: number }): string => {
  const min = setting.min ?? 0
  const max = setting.max ?? 100
  const value = typeof setting.value === 'number' ? setting.value : Number(setting.value)
  if (!Number.isFinite(value) || max === min) return '0%'
  return `${Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))}%`
}

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
  setup?: { base_url: string } | null
  extension_package?: string
  settings?: PlayerSetting[]
}

const props = defineProps<{
  player: Player
  isExpanded: boolean
}>()

defineEmits<{
  toggle: []
  'toggle-config': []
  'navigate-bluetooth': []
  'update-toslink-sensitivity': [sensitivity: string]
  'update-external-setting': [key: string, value: boolean | string | number]
  'cancel-config': []
  'save-config': []
}>()

// Descriptors mark an unmaintained player with the sentinel "Wanted", paired
// with a maintainer_url pointing at maintainers-wanted.md. Rendered raw it
// showed as a bare "Wanted" under the player's name, which reads as a status
// of the player rather than a call for a maintainer. Translated here rather
// than in the descriptors because the ones carrying it -- librespot,
// shairport, squeezelite -- are not shipped by any package (they are
// unowned files in /etc/hifiberry/players.d), so there is nothing to edit.
const MAINTAINER_WANTED = 'Wanted'
const MAINTAINER_WANTED_LABEL = 'Looking for maintainer'

const maintainerLabel = (name: string): string =>
  name.trim().toLowerCase() === MAINTAINER_WANTED.toLowerCase()
    ? MAINTAINER_WANTED_LABEL
    : name

// Drives the setup panel's "fill in the settings below" prompt. Every secret
// the player declares must have a value; read from the settings the registry
// already reports, so there is one source of truth -- a secret's value is
// never sent to the browser, only whether it is set.
const setupBaseUrl = computed(() => props.player.setup?.base_url ?? null)

const credentialsSet = computed(() => {
  const secrets = props.player.settings?.filter((s) => s.type === 'secret') ?? []
  return secrets.every((s) => s.is_set)
})

// Fetched here, not in the panel: the panel only exists while the card is
// expanded, so a collapsed card could not know -- and could not say -- that
// the player is not ready to be switched on.
const { status: setupStatus, setupIncomplete, needsBinary, refresh: refreshSetup } =
  usePlayerSetup(setupBaseUrl, credentialsSet)

const hasConfig = computed(() => {
  if (props.player.isExternal) {
    return (props.player.settings?.length ?? 0) > 0
  }
  // TOSLink only: it is part of the base image and keeps its own config
  // object. Airplay used to be listed here too, but shairport became an
  // extension -- it now arrives from a descriptor with config 'none', so the
  // clause never matched, and the panel it gated did nothing anyway.
  return props.player.name === 'TOSLink' && typeof props.player.config === 'object'
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

      // The one thing on a collapsed card that stops the toggle working, so
      // it gets the accent colour and is itself the way to open the panel.
      .player-setup-required {
        display: block;
        margin-top: 4px;
        padding: 0;
        border: 0;
        background: none;
        color: var(--primary);
        font-size: 0.8rem;
        font-weight: 600;
        text-align: left;
        cursor: pointer;

        &:hover {
          text-decoration: underline;
        }
      }

      .player-maintainer {
        margin-top: 4px;
        font-size: 0.75em;
        color: var(--color-body-secondary);

        .maintainer-link {
          color: var(--primary);
          text-decoration: none;

          &:hover {
            text-decoration: underline;
          }
        }
      }

      .player-card__install {
        display: inline-block;
        margin-top: 4px;
        font-size: 0.75em;
        color: var(--primary);
        text-decoration: none;

        &:hover {
          text-decoration: underline;
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

      /* Label and control are siblings in a two-column grid, so every control
         shares a left edge whatever its type, and the description spans the
         control column beneath it. Controls used to be nested inside the
         label, which is why these rules sit flat here rather than under
         .config-option. */
      .config-form {
        display: grid;
        grid-template-columns: minmax(6rem, max-content) minmax(0, 1fr);
        align-items: center;
        gap: 12px 20px;
        margin-bottom: 16px;
      }

      .config-option {
        font-size: 0.875rem;
        color: var(--color-body-secondary);
        cursor: pointer;
      }

      .config-control {
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 0;
      }

      .config-description {
        grid-column: 2;
        margin: -6px 0 4px 0;
        max-width: 52ch;
        font-size: 0.8rem;
        line-height: 1.45;
        color: var(--color-body-secondary);
        opacity: 0.7;
      }

      .number-input {
        width: 6em;
        height: 44px;
        padding: 12px 16px;
        border: 1px solid var(--color-sidebar-border);
        border-radius: 6px;
        background: var(--background-card);
        color: var(--color-body-secondary);
        font-family: inherit;
        font-size: 1rem;
      }

      /* Range inputs have no usable default styling and render bright blue on
         every platform, so track and thumb are drawn from scratch in the
         HiFiBerry accent. --fill is set inline from sliderFill(). */
      .slider-input {
        -webkit-appearance: none;
        appearance: none;
        flex: 1 1 auto;
        max-width: 16rem;
        height: 22px;
        margin: 0;
        background: transparent;
        cursor: pointer;

        &::-webkit-slider-runnable-track {
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(
            to right,
            var(--primary) 0 var(--fill, 0%),
            var(--color-sidebar-border) var(--fill, 0%) 100%
          );
        }

        &::-moz-range-track {
          height: 6px;
          border-radius: 999px;
          background: var(--color-sidebar-border);
        }

        &::-moz-range-progress {
          height: 6px;
          border-radius: 999px;
          background: var(--primary);
        }

        &::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          margin-top: -6px;
          border: none;
          border-radius: 50%;
          background: var(--primary);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
          transition: transform 0.12s ease;
        }

        &::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border: none;
          border-radius: 50%;
          background: var(--primary);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        }

        &:hover::-webkit-slider-thumb,
        &:active::-webkit-slider-thumb {
          transform: scale(1.12);
        }

        &:focus-visible {
          outline: none;

          &::-webkit-slider-thumb {
            box-shadow: 0 0 0 4px rgba(225, 30, 74, 0.25);
          }

          &::-moz-range-thumb {
            box-shadow: 0 0 0 4px rgba(225, 30, 74, 0.25);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          &::-webkit-slider-thumb {
            transition: none;
          }
        }
      }

      /* Beside the slider, not drifting to the far edge, so the number reads
         as the slider's value. */
      .slider-value {
        min-width: 3.5ch;
        font-size: 0.95rem;
        font-variant-numeric: tabular-nums;
        color: var(--color-head);
      }

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
        max-width: 22rem;
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

      .secret-field {
        display: flex;
        align-items: center;
        gap: 8px;

        input {
          flex: 1 1 auto;
          min-width: 0;
        }
      }

      .secret-state {
        flex: 0 0 auto;
        font-size: 0.85em;
        opacity: 0.7;
      }

      .secret-clear {
        flex: 0 0 auto;
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
