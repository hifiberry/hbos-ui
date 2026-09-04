<template>
  <PageContent title="Speaker Presets">
    <p class="intro">
      A speaker preset configures all four amplifier channels for one
      loudspeaker &mdash; crossover, driver equalisation, routing and levels.
      Presets need a DSP board running the profile they name.
    </p>

    <ContentBox v-if="loading">
      <p>Loading presets&hellip;</p>
    </ContentBox>

    <ContentBox v-else-if="loadError">
      <p class="error">{{ loadError }}</p>
    </ContentBox>

    <ContentBox v-else-if="presets.length === 0">
      <p>
        No speaker presets are installed. They ship with the
        <code>hifiberry-dspprofiles</code> package.
      </p>
    </ContentBox>

    <div v-else class="presetList">
      <ContentBox v-for="preset in presets" :key="preset.id">
        <div class="presetHeader">
          <Icon icon="tabler/speaker" class="presetIcon" />
          <div class="presetTitle">
            <h2>{{ preset.name }}</h2>
            <span v-if="preset.id === current" class="badge">Applied</span>
          </div>
        </div>

        <p v-if="preset.description" class="presetDescription">
          {{ preset.description }}
        </p>

        <p class="presetDetail">
          {{ totalFilters(preset) }} filters across four channels &middot;
          {{ preset.sampleRate / 1000 }} kHz &middot; {{ preset.requiredProfile }}
        </p>

        <p v-if="!preset.compatible" class="warning">
          {{ preset.incompatibleReason }}
        </p>

        <button
          v-if="preset.compatible"
          class="applyButton"
          :disabled="busy"
          @click="ask(preset, false)"
        >
          {{ applying === preset.id ? 'Applying…' : 'Apply' }}
        </button>

        <button
          v-else-if="profilePathFor(preset)"
          class="applyButton"
          :disabled="busy"
          @click="ask(preset, true)"
        >
          {{ applying === preset.id ? 'Installing…' : 'Install profile and apply' }}
        </button>
      </ContentBox>
    </div>

    <ConfirmationDialog
      :isOpen="pending !== null"
      :title="pending ? `Apply ${pending.name}?` : ''"
      :message="confirmationMessage"
      confirmButtonText="Apply"
      @confirm="confirmApply"
      @close="pending = null"
    />
  </PageContent>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageContent from '@/components/PageContent.vue'
import ContentBox from '@/components/ContentBox.vue'
import ConfirmationDialog from '@/components/ConfirmationDialog.vue'
import Icon from '@/components/Icon.vue'
import { useToastStore } from '@/stores/toast'
import {
  listSpeakerPresets,
  applySpeakerPreset,
  getDSPProfilesMetadata,
  updateDSPProfile,
  type SpeakerPresetSummary,
  type DSPProfile,
} from '@/api/dsptoolkit'

const toastStore = useToastStore()

const presets = ref<SpeakerPresetSummary[]>([])
const current = ref<string | null>(null)
const availableProfiles = ref<DSPProfile[]>([])
const loading = ref(true)
const loadError = ref('')
const applying = ref<string | null>(null)
const pending = ref<SpeakerPresetSummary | null>(null)
const pendingInstall = ref(false)

const busy = computed(() => applying.value !== null)

const confirmationMessage = computed(() => {
  const base =
    'This overwrites the filters, levels, delays and channel routing on all ' +
    'four channels, including any room correction already loaded into them.'
  return pendingInstall.value
    ? `The ${pending.value?.requiredProfile} DSP program will be installed first, ` +
      `replacing the one currently running. ${base}`
    : base
})

function totalFilters(preset: SpeakerPresetSummary): number {
  return Object.values(preset.filterCounts).reduce((sum, n) => sum + n, 0)
}

/**
 * The bundled DSP profile a preset needs, if one is installed on the device.
 *
 * Applying does not deploy profiles — it would have to change the checksum it
 * is recording against, mid-request — so a board on the wrong program is
 * offered the two steps explicitly.
 */
function profilePathFor(preset: SpeakerPresetSummary): string | null {
  const match = availableProfiles.value.find(
    (profile) => profile.programID === preset.requiredProfile,
  )
  return match?._system?.filepath ?? null
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const result = await listSpeakerPresets()
    presets.value = result.presets
    current.value = result.current
  } catch (error) {
    loadError.value =
      error instanceof Error ? error.message : 'Could not load speaker presets'
    loading.value = false
    return
  }

  // Best effort: without it the incompatible case simply offers no remedy.
  try {
    const metadata = await getDSPProfilesMetadata()
    availableProfiles.value = Object.values(metadata.profiles)
  } catch {
    availableProfiles.value = []
  }
  loading.value = false
}

function ask(preset: SpeakerPresetSummary, withInstall: boolean) {
  pending.value = preset
  pendingInstall.value = withInstall
}

async function confirmApply() {
  const preset = pending.value
  const withInstall = pendingInstall.value
  pending.value = null
  if (!preset) return

  applying.value = preset.id
  try {
    if (withInstall) {
      const path = profilePathFor(preset)
      if (!path) throw new Error(`${preset.requiredProfile} is not installed`)
      await updateDSPProfile({ file: path })
    }
    await applySpeakerPreset(preset.id)
    toastStore.showSuccessToast(`Applied ${preset.name}`)
    await load()
  } catch (error) {
    toastStore.showErrorToast(
      error instanceof Error ? error.message : `Could not apply ${preset.name}`,
    )
  } finally {
    applying.value = null
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.intro {
  margin-bottom: 20px;
  opacity: 0.8;
}

.presetList {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 25px;
}

.presetHeader {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.presetIcon {
  width: 24px;
  height: 24px;
  margin-right: 10px;
}

.presetTitle {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.badge {
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
}

.presetDescription,
.presetDetail {
  margin-bottom: 10px;
  opacity: 0.8;
}

.presetDetail {
  font-size: 0.9em;
}

.warning,
.error {
  margin-bottom: 10px;
  color: var(--color-warning, #c08000);
}

.applyButton {
  cursor: pointer;
}

.applyButton:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
