<template>
  <PageContent title="AES67" :backrouterLink="{ name: 'services' }">
    <div class="aes67-header">
      <p>
        Receive audio from a Dante network. Enable AES67 mode on the transmitter
        in Dante Controller and create a multicast flow, then pick the stream here.
      </p>
    </div>

    <div v-if="loading" class="section">
      <p>Looking for AES67 streams…</p>
    </div>

    <div v-else-if="error" class="section error">
      <p class="error-message">{{ error }}</p>
      <button class="secondary" @click="refresh">Retry</button>
    </div>

    <template v-else>
      <section class="section">
        <div class="section-head">
          <h2>Streams</h2>
          <button class="secondary" :disabled="busy" @click="refresh">Refresh</button>
        </div>

        <p v-if="streams.length === 0" class="hint">
          No streams announced yet. Dante re-announces about every 30 seconds, so
          give it a moment after enabling AES67 and creating a multicast flow.
        </p>

        <ul v-else class="stream-list">
          <li
            v-for="stream in streams"
            :key="stream.name"
            :class="{ selected: stream.name === status?.stream }"
          >
            <button class="stream" :disabled="busy" @click="select(stream.name)">
              <span class="stream-name">{{ stream.name }}</span>
              <span class="stream-detail">
                {{ stream.channels ?? '?' }} ch ·
                {{ stream.rate ? stream.rate / 1000 + ' kHz' : '? kHz' }} ·
                {{ stream.format ?? '?' }} ·
                {{ stream.address ?? '?' }}
              </span>
            </button>
            <span v-if="stream.name === status?.stream" class="badge">
              {{ status?.receiving ? 'playing' : 'selected' }}
            </span>
          </li>
        </ul>

        <button
          v-if="status?.stream"
          class="secondary"
          :disabled="busy"
          @click="select(null)"
        >
          Stop routing
        </button>
      </section>

      <section class="section">
        <h2>Latency</h2>
        <p class="hint">
          How much audio is buffered before playback. Lower is tighter but more
          prone to dropouts; the default is chosen for this board
          ({{ settings?.board_default_msec }} ms). Changing it restarts the audio
          engine and interrupts playback briefly.
        </p>

        <div class="latency-row">
          <input
            v-model.number="latencyInput"
            type="number"
            :min="settings?.min_msec ?? 1"
            :max="settings?.max_msec ?? 500"
            :disabled="busy"
            class="latency-input"
          />
          <span class="unit">ms</span>
          <button :disabled="busy || !latencyChanged" @click="applyLatency">
            Apply
          </button>
          <button
            v-if="settings?.overridden"
            class="secondary"
            :disabled="busy"
            @click="resetLatency"
          >
            Use board default
          </button>
        </div>

        <p v-if="settingsError" class="error-message">{{ settingsError }}</p>
        <p v-else-if="!settings?.overridden" class="hint">
          Following the board default.
        </p>
      </section>

      <section class="section">
        <h2>Status</h2>
        <dl class="status">
          <dt>Receiving</dt>
          <dd>{{ status?.receiving ? 'yes' : 'no' }}</dd>
          <dt>Output</dt>
          <dd>{{ status?.sink ?? '—' }}</dd>
          <dt>Interface</dt>
          <dd>{{ settings?.interface ?? '—' }}</dd>
          <dt>Streams found</dt>
          <dd>{{ status?.discovered ?? 0 }}</dd>
        </dl>
      </section>
    </template>
  </PageContent>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import PageContent from '@/components/PageContent.vue'
import {
  getSettings,
  getStatus,
  getStreams,
  setLatency,
  setSelection,
  type Aes67Settings,
  type Aes67Status,
  type Aes67Stream,
} from '@/api/aes67'

const streams = ref<Aes67Stream[]>([])
const status = ref<Aes67Status | null>(null)
const settings = ref<Aes67Settings | null>(null)
const latencyInput = ref<number | null>(null)
const loading = ref(true)
const busy = ref(false)
const error = ref<string | null>(null)
const settingsError = ref<string | null>(null)

let poll: ReturnType<typeof setInterval> | null = null

const latencyChanged = computed(
  () => latencyInput.value != null && latencyInput.value !== settings.value?.latency_msec,
)

const load = async (withSettings = true) => {
  const [streamList, currentStatus] = await Promise.all([getStreams(), getStatus()])
  streams.value = streamList
  status.value = currentStatus
  if (withSettings) {
    settings.value = await getSettings()
    latencyInput.value = settings.value.latency_msec
  }
}

const refresh = async () => {
  loading.value = true
  error.value = null
  try {
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

const select = async (name: string | null) => {
  busy.value = true
  error.value = null
  try {
    await setSelection(name)
    await load(false)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    busy.value = false
  }
}

const applyLatency = async () => {
  if (latencyInput.value == null) return
  busy.value = true
  settingsError.value = null
  try {
    settings.value = await setLatency(latencyInput.value)
    latencyInput.value = settings.value.latency_msec
    // PipeWire has just restarted; the graph needs a moment to settle.
    await new Promise((resolve) => setTimeout(resolve, 3000))
    await load(false)
  } catch (err) {
    settingsError.value = err instanceof Error ? err.message : String(err)
  } finally {
    busy.value = false
  }
}

const resetLatency = async () => {
  busy.value = true
  settingsError.value = null
  try {
    settings.value = await setLatency(null)
    latencyInput.value = settings.value.latency_msec
    await new Promise((resolve) => setTimeout(resolve, 3000))
    await load(false)
  } catch (err) {
    settingsError.value = err instanceof Error ? err.message : String(err)
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  await refresh()
  // Streams appear only when a SAP announcement arrives (~30s cadence), so the
  // list is polled rather than loaded once.
  poll = setInterval(() => {
    if (!busy.value) load(false).catch(() => undefined)
  }, 10000)
})

onUnmounted(() => {
  if (poll) clearInterval(poll)
})
</script>

<style scoped lang="scss">
.aes67-header {
  margin-bottom: 32px;

  p {
    margin: 0;
    color: var(--color-body-secondary);
  }
}

.section {
  margin-bottom: 32px;

  h2 {
    margin: 0 0 8px 0;
    color: var(--color-head);
  }
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.hint {
  margin: 0 0 12px 0;
  color: var(--color-body-secondary);
}

.error-message {
  color: var(--color-error, #c0392b);
}

.stream-list {
  list-style: none;
  margin: 0 0 12px 0;
  padding: 0;

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid var(--color-border, rgba(128, 128, 128, 0.25));
  }

  li.selected .stream-name {
    font-weight: 600;
  }
}

.stream {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 12px 0;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  color: inherit;

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
}

.stream-detail {
  color: var(--color-body-secondary);
  font-size: 0.85em;
}

.badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75em;
  background: var(--color-accent, #2d7dd2);
  color: #fff;
}

.latency-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.latency-input {
  width: 6em;
  padding: 6px 8px;
}

.unit {
  color: var(--color-body-secondary);
  margin-right: 8px;
}

.status {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 16px;
  margin: 0;

  dt {
    color: var(--color-body-secondary);
  }

  dd {
    margin: 0;
  }
}
</style>
