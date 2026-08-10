<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageContent from '@/components/PageContent.vue'
import ExtensionCard from '@/components/ExtensionCard.vue'
import StatusBlock from '@/components/StatusBlock.vue'
import { useInstallJob } from '@/composables/useInstallJob'
import { useToastStore } from '@/stores/toast'
import {
  installExtension,
  listExtensions,
  refreshExtensions,
  uninstallExtension,
  type Extension,
  type ExtensionCategory,
} from '@/api/extensions'

const route = useRoute()
const toast = useToastStore()

const extensions = ref<Extension[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
const search = ref('')
const category = ref<ExtensionCategory | 'all'>('all')

const dialogOpen = ref(false)
const dialogExtension = ref<Extension | null>(null)
const showLog = ref(false)

const job = useInstallJob()

const categories: Array<{ value: ExtensionCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'player', label: 'Players' },
  { value: 'dsp', label: 'DSP' },
  { value: 'tool', label: 'Tools' },
]

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return extensions.value.filter((extension) => {
    if (category.value !== 'all' && extension.category !== category.value) return false
    if (!term) return true
    return (
      extension.name.toLowerCase().includes(term) ||
      extension.summary.toLowerCase().includes(term) ||
      extension.package.toLowerCase().includes(term)
    )
  })
})

const busyPackage = computed(() =>
  job.isRunning.value ? (job.job.value?.package ?? null) : null,
)

async function load() {
  loading.value = true
  loadError.value = null
  try {
    const response = await listExtensions()
    extensions.value = response.data.extensions
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  try {
    const response = await refreshExtensions()
    job.track(response.data.job.id)
  } catch (e) {
    toast.showErrorToast(e instanceof Error ? e.message : String(e))
  }
}

async function onInstall(pkg: string) {
  dialogExtension.value = extensions.value.find((e) => e.package === pkg) ?? null
  dialogOpen.value = true
  showLog.value = false
  try {
    const response = await installExtension(pkg)
    job.track(response.data.job.id)
  } catch (e) {
    dialogOpen.value = false
    toast.showErrorToast(e instanceof Error ? e.message : String(e))
  }
}

async function onUninstall(pkg: string) {
  dialogExtension.value = extensions.value.find((e) => e.package === pkg) ?? null
  dialogOpen.value = true
  showLog.value = false
  try {
    const response = await uninstallExtension(pkg)
    job.track(response.data.job.id)
  } catch (e) {
    dialogOpen.value = false
    toast.showErrorToast(e instanceof Error ? e.message : String(e))
  }
}

function closeDialog() {
  dialogOpen.value = false
  dialogExtension.value = null
}

// Refresh the catalog whenever a job finishes, so state flips to installed.
watch(
  () => job.isDone.value,
  (done) => {
    if (done) void load()
  },
)

onMounted(async () => {
  await load()
  const requested = route.query.install
  if (typeof requested === 'string' && requested) {
    const match = extensions.value.find((e) => e.package === requested)
    if (match && match.state !== 'installed') void onInstall(requested)
  }
})
</script>

<template>
  <PageContent title="Extensions" :backrouterLink="{ name: 'services' }">
    <div class="extensions-header">
      <p>Browse and install optional software packages for players, DSP and system tools.</p>
    </div>

    <div class="extensions-toolbar">
      <input v-model="search" type="search" placeholder="Search extensions" class="extensions-search" />
      <select v-model="category" class="extensions-category">
        <option v-for="entry in categories" :key="entry.value" :value="entry.value">
          {{ entry.label }}
        </option>
      </select>
      <button type="button" class="extensions-refresh-btn" :disabled="job.isRunning.value" @click="onRefresh">
        Refresh
      </button>
      <router-link :to="{ name: 'extension-sources' }" class="extensions-sources-link">Sources</router-link>
    </div>

    <p v-if="loading">Loading extensions&hellip;</p>
    <StatusBlock v-else-if="loadError" variant="error" class="extensions-error">{{ loadError }}</StatusBlock>
    <p v-else-if="!extensions.length">
      No extensions found. Add a source to see extensions here.
    </p>
    <p v-else-if="!filtered.length">No extensions match this filter.</p>

    <div v-else class="extensions-list">
      <ExtensionCard
        v-for="extension in filtered"
        :key="extension.package"
        :extension="extension"
        :busy="busyPackage === extension.package"
        @install="onInstall"
        @uninstall="onUninstall"
      />
    </div>

    <div v-if="dialogOpen" class="extensions-dialog-overlay">
      <div class="extensions-dialog">
        <h3>{{ dialogExtension?.name ?? 'Working' }}</h3>

        <p class="extensions-phase">{{ job.phase.value ?? 'starting' }}</p>
        <progress :value="job.percent.value" max="100" class="extensions-progress" />

        <StatusBlock v-if="job.isFailed.value" variant="error" class="extensions-error">
          Failed: {{ job.error.value }}
        </StatusBlock>

        <p v-if="job.isDone.value && job.rebootRequired.value">
          This change needs a reboot to take effect.
        </p>

        <button type="button" class="extensions-log-toggle" @click="showLog = !showLog">
          {{ showLog ? 'Hide' : 'Show' }} details
        </button>

        <pre v-if="showLog" class="extensions-log">{{ job.log.value.join('\n') }}</pre>

        <button type="button" class="extensions-dialog-close" :disabled="job.isRunning.value" @click="closeDialog">
          Close
        </button>
      </div>
    </div>
  </PageContent>
</template>

<style scoped lang="scss">
.extensions-header {
  margin-bottom: 32px;

  p {
    margin: 0;
    color: var(--color-body-secondary);
  }
}

.extensions-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 24px;
}

.extensions-search {
  flex: 1;
  min-width: 200px;
}

.extensions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

// Spacing only - StatusBlock carries the tint, the border and the icon. Two
// consumers: the page-level load error, which sits on --background-body, and
// the install dialog's failure line, which sits on --background-card.
.extensions-error {
  margin: 12px 0;
}

.extensions-dialog-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.extensions-dialog {
  // --color-background is undefined, so the #fff fallback rendered in BOTH
  // themes while the dialog's text follows body's --color-body, which is
  // #fff in dark: white on white, 1.00:1 - the whole install/progress
  // dialog and its job log were unreadable. --background-card is defined,
  // theme-aware (#fff / #333) and equal to the old fallback in light, so
  // light is unchanged and dark becomes a legible #333 dialog.
  background-color: var(--background-card);
  border-radius: 8px;
  padding: 24px;
  min-width: 320px;
  max-width: 480px;
}

.extensions-progress {
  width: 100%;
}

.extensions-log {
  max-height: 16rem;
  overflow: auto;
  font-family: monospace;
  font-size: 0.8em;
  background-color: var(--background-secondary);
  padding: 12px;
  border-radius: 6px;
}
</style>
