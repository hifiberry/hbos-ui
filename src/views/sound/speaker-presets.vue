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

    <ContentBox v-else-if="dspMissing" data-test="no-dsp">
      <p>
        Speaker presets need a DSP board. This system either has none, or its
        DSP service is not running.
      </p>
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
          data-test="apply"
          :disabled="busy"
          @click="ask(preset, false)"
        >
          {{ applying === preset.id ? 'Applying…' : 'Apply' }}
        </button>

        <button
          v-else-if="canInstallProfileFor(preset)"
          class="applyButton"
          data-test="install-and-apply"
          :disabled="busy"
          @click="ask(preset, true)"
        >
          {{ applying === preset.id ? 'Installing…' : 'Install profile and apply' }}
        </button>
      </ContentBox>
    </div>

    <ConfirmationDialog
      :isOpen="pending !== null"
      :title="confirmationTitle"
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
import { useDSPToolkitStore } from '@/stores/dsp-toolkit'
import {
  listSpeakerPresets,
  applySpeakerPreset,
  getMetadata,
  getDSPProfilesMetadata,
  updateDSPProfile,
  type SpeakerPresetSummary,
  type DSPProfile,
} from '@/api/dsptoolkit'

const toastStore = useToastStore()
const dspToolkitStore = useDSPToolkitStore()

const presets = ref<SpeakerPresetSummary[]>([])
const current = ref<string | null>(null)
const availableProfiles = ref<DSPProfile[]>([])
/**
 * The DSP program currently running, or null when that could not be read.
 *
 * Both fields have to be there to be useful: programID says which program is
 * loaded, modelName says which board it was built for. A profile with no
 * modelName cannot be compared against another, so it is treated the same as
 * no metadata at all.
 */
const loadedProfile = ref<{ programID: string; modelName: string } | null>(null)
const loading = ref(true)
const loadError = ref('')
const dspMissing = ref(false)
const applying = ref<string | null>(null)
const pending = ref<SpeakerPresetSummary | null>(null)
const pendingInstall = ref(false)

const busy = computed(() => applying.value !== null)

const confirmationTitle = computed(() => {
  if (!pending.value) return ''
  // The install path deploys a DSP program to EEPROM before it applies
  // anything, which is the larger half of what is about to happen. Saying only
  // "Apply <name>?" leaves that to the body text.
  return pendingInstall.value
    ? `Install profile and apply ${pending.value.name}?`
    : `Apply ${pending.value.name}?`
})

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
function installedProfileFor(preset: SpeakerPresetSummary): DSPProfile | null {
  return (
    availableProfiles.value.find(
      (profile) => profile.programID === preset.requiredProfile,
    ) ?? null
  )
}

function profilePathFor(preset: SpeakerPresetSummary): string | null {
  return installedProfileFor(preset)?._system?.filepath ?? null
}

/**
 * Whether to offer "install profile and apply" for an incompatible preset.
 *
 * That button writes a DSP program into the board's EEPROM, where it persists
 * across reboots and is undone only from the DSP Programs page. It is the
 * right remedy for exactly one incompatibility — the board is a board this
 * preset supports, but the wrong program is loaded on it — and offering it for
 * any other reason does real damage.
 *
 * hifiberry-dspprofiles is a hard dependency of the OS images, so every device
 * has every bundled profile on disk and every speaker preset installed. "Is
 * the required profile present?" is therefore always true and says nothing
 * about whether deploying it is a good idea. Three things have to hold
 * instead:
 *
 *  - the loaded profile could be read at all. With no DSP board there is no
 *    metadata, the incompatibility is not a program mismatch, and the button
 *    would only produce a raw error.
 *  - the loaded program really is a different one. If the right program is
 *    already running, whatever makes the preset incompatible (version, sample
 *    rate, bank sizes) deploying the same profile again will not fix.
 *  - both profiles target the same board. This is what keeps a DAC+DSP or DSP
 *    Add-On away from a Beocreate profile: modelName is the profile's own
 *    statement of the hardware it is for, and the DSP Programs page filters
 *    the same way before it offers a profile for deployment.
 */
function canInstallProfileFor(preset: SpeakerPresetSummary): boolean {
  const loaded = loadedProfile.value
  if (!loaded) return false
  if (loaded.programID === preset.requiredProfile) return false

  const candidate = installedProfileFor(preset)
  if (!candidate) return false
  return candidate.modelName === loaded.modelName
}

async function load() {
  loading.value = true
  loadError.value = ''
  dspMissing.value = false
  loadedProfile.value = null
  availableProfiles.value = []

  try {
    const result = await listSpeakerPresets()
    presets.value = result.presets
    current.value = result.current
  } catch (error) {
    // A device without the DSP service answers this with "HTTP 502: Bad
    // Gateway", which tells a user nothing about what to do. The page is
    // reachable from Sound unconditionally, so this is a normal state and not
    // an error worth quoting. Ask the hardware-detection store what is
    // actually the matter rather than reading the message.
    const status = await dspToolkitStore
      .getDSPStatus()
      .catch((): 'backend_error' => 'backend_error')
    if (status === 'yes') {
      loadError.value =
        error instanceof Error ? error.message : 'Could not load speaker presets'
    } else {
      dspMissing.value = true
    }
    loading.value = false
    return
  }

  // Both are best effort. Without either, no remedy is offered for an
  // incompatible preset, which is the safe direction to fail in.
  try {
    const metadata = await getMetadata()
    loadedProfile.value =
      typeof metadata.programID === 'string' &&
      metadata.programID !== '' &&
      typeof metadata.modelName === 'string' &&
      metadata.modelName !== ''
        ? { programID: metadata.programID, modelName: metadata.modelName }
        : null
  } catch {
    loadedProfile.value = null
  }

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
  padding: 12px 20px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 1rem;
  transition: background-color 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--primary-dark, var(--primary));
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
