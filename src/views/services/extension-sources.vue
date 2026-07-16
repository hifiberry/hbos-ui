<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageContent from '@/components/PageContent.vue'
import { useToastStore } from '@/stores/toast'
import {
  addExtensionSource,
  addGithubSource,
  listExtensionSources,
  listGithubSources,
  removeExtensionSource,
  removeGithubSource,
  type ExtensionSource,
  type GithubSource,
} from '@/api/extensions'

const toast = useToastStore()

const sources = ref<ExtensionSource[]>([])
const loading = ref(false)
const saving = ref(false)
const showForm = ref(false)

const form = ref({ id: '', uri: '', suite: 'trixie', components: 'main', key: '' })

// GitHub sources (a separate subsystem from apt repos)
const githubSources = ref<GithubSource[]>([])
const ghShowForm = ref(false)
const ghSaving = ref(false)
const ghRepo = ref('')

async function load() {
  loading.value = true
  try {
    const response = await listExtensionSources()
    sources.value = response.data.sources
  } catch (e) {
    toast.showErrorToast(e instanceof Error ? e.message : String(e))
  } finally {
    loading.value = false
  }
}

async function onAdd() {
  saving.value = true
  try {
    await addExtensionSource({ ...form.value })
    toast.showSuccessToast(`Added source ${form.value.id}`)
    form.value = { id: '', uri: '', suite: 'trixie', components: 'main', key: '' }
    showForm.value = false
    await load()
  } catch (e) {
    toast.showErrorToast(e instanceof Error ? e.message : String(e))
  } finally {
    saving.value = false
  }
}

async function onRemove(id: string) {
  if (!confirm(`Remove source "${id}"? Extensions from this source will no longer be updatable.`)) {
    return
  }
  try {
    await removeExtensionSource(id)
    toast.showSuccessToast(`Removed source ${id}`)
    await load()
  } catch (e) {
    toast.showErrorToast(e instanceof Error ? e.message : String(e))
  }
}

async function loadGithub() {
  try {
    const response = await listGithubSources()
    githubSources.value = response.data.sources
  } catch (e) {
    toast.showErrorToast(e instanceof Error ? e.message : String(e))
  }
}

async function onAddGithub() {
  ghSaving.value = true
  try {
    await addGithubSource(ghRepo.value.trim())
    toast.showSuccessToast(`Added GitHub source ${ghRepo.value.trim()}`)
    ghRepo.value = ''
    ghShowForm.value = false
    await loadGithub()
  } catch (e) {
    toast.showErrorToast(e instanceof Error ? e.message : String(e))
  } finally {
    ghSaving.value = false
  }
}

async function onRemoveGithub(id: string, repo: string) {
  if (!confirm(`Remove GitHub source "${repo}"? Its extensions will no longer be updatable.`)) {
    return
  }
  try {
    await removeGithubSource(id)
    toast.showSuccessToast(`Removed GitHub source ${repo}`)
    await loadGithub()
  } catch (e) {
    toast.showErrorToast(e instanceof Error ? e.message : String(e))
  }
}

onMounted(() => {
  load()
  loadGithub()
})
</script>

<template>
  <PageContent title="Extension sources" :backrouterLink="{ name: 'extensions' }">
    <p v-if="loading">Loading sources&hellip;</p>

    <ul v-else class="sources__list">
      <li v-for="source in sources" :key="source.id" class="sources__item">
        <div>
          <strong>{{ source.id }}</strong>
          <div class="sources__uri">
            {{ source.uri }} {{ source.suite }} {{ source.components }}
          </div>
        </div>
        <button type="button" @click="onRemove(source.id)">Remove</button>
      </li>
      <li v-if="!sources.length" class="sources__empty">No extension sources configured.</li>
    </ul>

    <button v-if="!showForm" type="button" @click="showForm = true">Add source</button>

    <form v-else class="sources__form" @submit.prevent="onAdd">
      <p class="sources__warning">
        <strong>Only add sources you trust.</strong> Adding a source gives its maintainer
        full root control over this device through package installation scripts, and the
        API has no authentication &mdash; anyone on your network can trigger an install
        from any configured source. Only add a source you are certain about.
      </p>

      <label>
        Name
        <input v-model="form.id" required pattern="[a-z0-9][a-z0-9-]*" />
      </label>
      <label>
        Repository URL
        <input v-model="form.uri" required type="url" placeholder="https://repo.example.com" />
      </label>
      <label>
        Suite
        <input v-model="form.suite" required />
      </label>
      <label>
        Components
        <input v-model="form.components" required />
      </label>
      <label>
        Signing key (ASCII-armored)
        <textarea
          v-model="form.key"
          required
          rows="6"
          placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----"
        />
      </label>
      <p class="sources__hint">
        A signing key is required. Unsigned repositories are refused by the backend.
      </p>

      <div class="sources__actions">
        <button type="submit" :disabled="saving">
          {{ saving ? 'Adding…' : 'Add source' }}
        </button>
        <button type="button" :disabled="saving" @click="showForm = false">Cancel</button>
      </div>
    </form>

    <hr class="sources__divider" />

    <h2 class="sources__heading">GitHub sources</h2>
    <p class="sources__hint">
      Install extensions published as GitHub releases. Add a repository as
      <code>owner/name</code>; its latest release provides the extension.
    </p>

    <ul class="sources__list">
      <li v-for="source in githubSources" :key="source.id" class="sources__item">
        <div>
          <strong>{{ source.repo }}</strong>
          <div class="sources__uri">github.com/{{ source.repo }}</div>
        </div>
        <button type="button" @click="onRemoveGithub(source.id, source.repo)">Remove</button>
      </li>
      <li v-if="!githubSources.length" class="sources__empty">No GitHub sources configured.</li>
    </ul>

    <button v-if="!ghShowForm" type="button" @click="ghShowForm = true">Add GitHub source</button>

    <form v-else class="sources__form" @submit.prevent="onAddGithub">
      <p class="sources__warning">
        <strong>Only add repositories you trust.</strong> Installing an extension runs
        its package scripts as root, and the API has no authentication &mdash; anyone on
        your network can trigger an install from any configured source.
      </p>

      <label>
        Repository (owner/name)
        <input
          v-model="ghRepo"
          required
          pattern="[A-Za-z0-9][A-Za-z0-9._-]*/[A-Za-z0-9._-]+"
          placeholder="pulpier/tidal-connect-hifiberry"
        />
      </label>

      <div class="sources__actions">
        <button type="submit" :disabled="ghSaving">
          {{ ghSaving ? 'Adding…' : 'Add GitHub source' }}
        </button>
        <button type="button" :disabled="ghSaving" @click="ghShowForm = false">Cancel</button>
      </div>
    </form>
  </PageContent>
</template>

<style scoped lang="scss">
.sources__list {
  margin-bottom: 24px;
  padding: 0;
  list-style: none;
}

.sources__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 8px 0;
}

.sources__uri {
  color: var(--color-body-secondary);
  font-size: 0.85em;
}

.sources__empty {
  color: var(--color-body-secondary);
}

.sources__form label {
  display: block;
  margin-bottom: 0.75rem;
}

.sources__form textarea {
  width: 100%;
  font-family: monospace;
}

.sources__warning {
  border-left: 3px solid var(--color-error, #dc3545);
  padding-left: 0.75rem;
  margin-bottom: 1rem;
}

.sources__hint {
  color: var(--color-body-secondary);
  font-size: 0.85em;
}

.sources__actions {
  display: flex;
  gap: 12px;
}

.sources__divider {
  margin: 28px 0 20px;
  border: none;
  border-top: 1px solid var(--color-border, #333);
}

.sources__heading {
  margin: 0 0 4px;
}
</style>
