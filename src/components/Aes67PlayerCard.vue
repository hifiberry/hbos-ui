<template>
  <div class="card" data-test="aes67-player">
    <div class="player-item" :class="{ expanded: panelOpen, greyed }">
      <div class="player-main">
        <div class="player-info">
          <Icon icon="ethernet" class="player-icon" />
          <div class="player-details">
            <h3>AES67 (aas)</h3>
            <div class="player-status">
              <span :class="['status-badge', active ? 'green' : 'gray']" data-test="aes67-status">
                {{ active ? 'active' : 'inactive' }}
              </span>
            </div>
            <!-- No reason until the card has read the audio server itself. -->
            <template v-if="serverKnown">
              <div v-if="serverError" class="player-note" data-test="aes67-server-error">
                <span>Could not read the audio server: {{ serverError }}</span>
                <button class="btn btn-secondary btn-sm" :disabled="busy" data-test="aes67-server-retry" @click="retryServer">
                  Retry
                </button>
              </div>
              <p v-else-if="!aasRuns" class="player-note" data-test="aes67-requires-aas">
                Requires the aas audio server
                <router-link :to="{ name: 'audio-server' }">Audio Server</router-link>
              </p>
              <p v-else-if="unavailable" class="player-note" data-test="aes67-unavailable">
                Requires a wired network connection
              </p>
              <div v-else-if="loadError" class="player-note" data-test="aes67-error">
                <span>Could not read the AES67 settings: {{ loadError }}</span>
                <button class="btn btn-secondary btn-sm" :disabled="busy" data-test="aes67-retry" @click="retry">
                  Retry
                </button>
              </div>
              <p v-else-if="!aes67" class="player-note" data-test="aes67-reading">Reading…</p>
            </template>
          </div>
        </div>
        <div class="player-actions">
          <div class="player-toggle">
            <ToggleSwitch
              :key="`enabled-${loads}`"
              :model-value="aes67?.enabled ?? false"
              :disabled="disabled"
              :loading="busy"
              data-test="aes67-enabled"
              @update:model-value="(enabled: boolean) => change({ enabled })"
            />
          </div>
          <div class="player-expand">
            <div
              class="expand-caret"
              :class="{ disabled: greyed }"
              data-test="aes67-expand"
              @click="toggleSettings"
            >
              <Icon icon="caret-down" class="config-caret" :class="{ expanded: panelOpen }" />
            </div>
          </div>
        </div>
      </div>

      <div v-if="panelOpen && aes67" class="config-section" data-test="aes67-settings">
        <div class="config-content">
          <div class="aes67-row">
            <label for="aes67-stream">Stream</label>
            <select
              id="aes67-stream"
              :key="`stream-${loads}`"
              :value="aes67.stream ?? ''"
              :disabled="disabled"
              data-test="aes67-stream"
              @change="selectStream"
            >
              <option v-if="aes67.stream === null" value="" disabled>No stream selected</option>
              <option v-if="unannouncedStream" :value="unannouncedStream">
                {{ unannouncedStream }} (currently unavailable)
              </option>
              <option v-for="name in streams" :key="name" :value="name">{{ name }}</option>
            </select>
          </div>
          <p data-test="aes67-latency-current">
            Latency: <strong>{{ latencyLabel }}</strong>
          </p>
          <div class="latency-row">
            <input
              v-model="latencyInput"
              type="number"
              min="1"
              max="100"
              step="1"
              class="latency-input"
              aria-label="AES67 latency in ms"
              :placeholder="automaticLabel"
              :disabled="disabled"
              data-test="aes67-latency-input"
            />
            <span>ms</span>
            <button
              class="btn btn-primary btn-sm"
              :disabled="disabled || typedLatency === null"
              data-test="aes67-latency-save"
              @click="setLatency"
            >
              Set
            </button>
            <button
              class="btn btn-secondary btn-sm"
              :disabled="disabled || aes67.latency_auto"
              data-test="aes67-latency-auto"
              @click="change({ latency_ms: 'auto' })"
            >
              Automatic
            </button>
          </div>
          <p v-if="note" class="latency-note" :class="note.level" data-test="aes67-latency-note">
            {{ note.text }}
          </p>
          <p class="section-hint">
            The lowest possible latency depends on the sound card latency, set on the Audio Server page.
          </p>
          <p class="section-hint">Changes take effect immediately.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, type WatchStopHandle } from 'vue'
import { storeToRefs } from 'pinia'
import Icon from '@/components/Icon.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import { useToastStore } from '@/stores/toast'
import { useAudioServerStore } from '@/stores/audio-server'
import { getAes67, getAes67Streams, isAasError, setAes67Input, type Aes67Input } from '@/api/aas'
import { aes67LatencyNote, validLatency } from '@/composables/useLatencyNotes'

// The AES67 input of aas, shown as a player. It is not a systemd service, so
// it does not go through PlayerCard; it draws the same card. Every change
// goes to aas at once (no restart); after each one the card reloads
// `GET /aes67` and shows what aas holds, whether the change took or not.

type Aes67Patch = Parameters<typeof setAes67Input>[0]

const toastStore = useToastStore()
const store = useAudioServerStore()
const { running, loaded, error: serverError } = storeToRefs(store)

const aes67 = ref<Aes67Input | null>(null)
/** `GET /aes67` answered 404: this aas has no AES67, as without a wired network. */
const unavailable = ref(false)
const loadError = ref<string | null>(null)
/** The announced streams that can be selected, by name. */
const streams = ref<string[]>([])
const busy = ref(false)
const expanded = ref(false)
/** What the AES67 latency input holds: a number, or '' when empty (Automatic). */
const latencyInput = ref<number | string>('')
/**
 * Counts loads. The switch and the select are keyed on it: after a refused
 * change aas holds the same value as before, which Vue would not patch back
 * over what the user clicked.
 */
const loads = ref(0)
/** The card's own read of the audio server is done: until then it gives no reason. */
const checked = ref(false)
let unmounted = false
let stopWatch: WatchStopHandle | null = null
/**
 * Counts `GET /aes67` requests, and reset() bumps it too: an answer to an
 * older request (a reload after a change, still in flight when aas stopped)
 * must not overwrite what is newer.
 */
let loadSeq = 0

const serverKnown = computed(() => checked.value && loaded.value)
/** Only a successful read says which server runs; after a failed one `running` is a stale default. */
const aasRuns = computed(() => serverKnown.value && !serverError.value && running.value === 'aas')
/** Dimmed, with switch and settings disabled, until aas answers with an AES67 input. */
const greyed = computed(() => !aasRuns.value || aes67.value === null)
const disabled = computed(() => greyed.value || busy.value)
const panelOpen = computed(() => expanded.value && !greyed.value)
const active = computed(() => !greyed.value && !!aes67.value?.enabled && !!aes67.value?.receiving)

const loadStreams = async (seq: number) => {
  const result = await getAes67Streams()
  if (seq !== loadSeq || unmounted) return
  streams.value = isAasError(result) ? [] : result.filter((s) => s.selectable).map((s) => s.name)
}

const load = async (withStreams: boolean) => {
  const seq = ++loadSeq
  const result = await getAes67()
  if (seq !== loadSeq || unmounted) return
  if (isAasError(result)) {
    aes67.value = null
    unavailable.value = result.error === 'HTTP 404'
    loadError.value = unavailable.value ? null : result.message
    return
  }
  unavailable.value = false
  loadError.value = null
  aes67.value = result.input
  loads.value += 1
  latencyInput.value = result.input.latency_auto ? '' : result.input.latency_ms
  if (withStreams) await loadStreams(seq)
}

const reset = () => {
  loadSeq += 1
  expanded.value = false
  aes67.value = null
  unavailable.value = false
  loadError.value = null
  streams.value = []
}

// The audio server is read again on mount: the app may have stayed open over
// the reboot that switched it.
onMounted(async () => {
  await store.load()
  if (unmounted) return
  checked.value = true
  stopWatch = watch(
    aasRuns,
    (runs) => {
      if (runs) void load(true)
      else reset()
    },
    { immediate: true },
  )
})
onUnmounted(() => {
  unmounted = true
  stopWatch?.()
})

const retry = async () => {
  busy.value = true
  try {
    await load(true)
  } finally {
    busy.value = false
  }
}

/** Reading the audio server again; the watch on `aasRuns` then loads AES67. */
const retryServer = async () => {
  busy.value = true
  try {
    await store.load()
  } finally {
    busy.value = false
  }
}

const toggleSettings = () => {
  if (!greyed.value) expanded.value = !expanded.value
}

/** A chosen stream that is no longer announced stays shown and selected. */
const unannouncedStream = computed(() => {
  const stream = aes67.value?.stream
  return stream && !streams.value.includes(stream) ? stream : null
})

/** Automatic plays at the board's value, but never below the floor a playing stream holds. */
const automaticLabel = computed(() => {
  const input = aes67.value
  if (!input) return 'Automatic'
  const ms = Math.max(input.latency_ms, input.latency_floor_ms ?? input.latency_ms)
  return `Automatic (${ms} ms)`
})

const latencyLabel = computed(() =>
  aes67.value?.latency_auto ? automaticLabel.value : `${aes67.value?.latency_ms} ms`,
)

const typedLatency = computed(() => {
  const value = latencyInput.value
  if (typeof value === 'string' && value.trim() === '') return null
  return validLatency(typeof value === 'number' ? value : Number(value))
})

/** For a number only: the input is empty while Automatic, so Automatic shows no note. */
const note = computed(() =>
  typedLatency.value === null ? null : aes67LatencyNote(typedLatency.value, aes67.value?.latency_floor_ms),
)

/** Sends one change to aas, then shows what aas holds; the streams too after turning it on. */
const change = async (patch: Aes67Patch) => {
  busy.value = true
  try {
    const result = await setAes67Input(patch)
    const ok = !isAasError(result)
    if (!ok) toastStore.showErrorToast(`Could not change the AES67 settings: ${result.message}`)
    await load(ok && patch.enabled === true)
  } finally {
    busy.value = false
  }
}

const selectStream = (event: Event) => {
  const stream = (event.target as HTMLSelectElement).value
  if (stream && stream !== aes67.value?.stream) void change({ stream })
}

const setLatency = () => {
  const latency = typedLatency.value
  if (latency !== null) void change({ latency_ms: latency })
}
</script>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;

// The layout rules are PlayerCard's, so this card reads as one of the list.
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

      .player-note {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 8px;
        margin: 6px 0 0 0;
        font-size: 0.8rem;
        color: var(--color-body-secondary);

        a {
          color: var(--primary);
          text-decoration: none;

          &:hover {
            text-decoration: underline;
          }
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

        &.disabled {
          cursor: default;

          &:hover {
            background: none;
          }
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

        &:not(.disabled):hover .config-caret {
          color: var(--color-head);
        }
      }
    }
  }

  .config-section {
    width: 100%;

    .config-content {
      @include service-content-box;

      p {
        margin: 0 0 6px 0;
      }

      .section-hint {
        color: var(--color-body-secondary);
      }

      .aes67-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: 0 0 12px 0;
      }

      .latency-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin: 12px 0;
      }

      .latency-input {
        width: 15em;
      }

      // The fields as the Audio Server page draws them.
      .latency-input,
      select {
        padding: 8px 10px;
        border: 1px solid rgba(128, 128, 128, 0.4);
        border-radius: 6px;
        background: var(--background-body, #fafafa);
        color: var(--color-body);
        font-size: 1rem;

        &:focus {
          outline: none;
          border-color: var(--primary);
        }

        &:disabled {
          opacity: 0.6;
        }
      }

      select {
        min-width: 13em;
      }

      .latency-note.amber {
        color: var(--color-warning);
      }

      .latency-note.red {
        color: var(--color-error);
      }
    }
  }

  // Dimmed as a player that is not installed, but the line saying why (and
  // its link or Retry) stays readable.
  &.greyed {
    .player-icon,
    .player-details h3,
    .player-status,
    .player-actions {
      opacity: 0.6;
    }

    .player-icon {
      color: #999;
    }

    .player-details h3 {
      color: #999;
    }
  }
}
</style>
