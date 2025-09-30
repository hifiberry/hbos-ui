<template>
  <div class="dsp-programs-page">
    <div class="dsp-programs">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'services' }">DSP Programs</AppBackRouter>
    </div>

    <div class="dsp-programs-content">
      <div class="dsp-programs-header">
        <p>Here you can download the software to your digital sound processor. When it is installed, you can change the sound settings in the "Sound" menu.</p>
      </div>

      <!-- Show simple message when DSP is not available -->
      <div v-if="dspError || detectedDSP?.status !== 'detected'" class="card">
        <div class="card-body">
          <div class="alert alert-info mb-0">
            <div class="d-flex align-items-center justify-content-center">
              <div class="text-center">
                <AppIcon name="info-circle" class="text-info mb-3" size="3rem" />
                <h4 class="alert-title">{{ dspError || 'No DSP hardware detected' }}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DSP Programs Card - Only show if DSP is detected -->
      <template v-else>
        <h2>Installed DSP profile</h2>
        <div class="info-card">
          <div class="card-header">
            <AppIcon icon="info" class="card-icon" />
          </div>
          <table class="info-table">
            <tbody>
              <template v-if="cacheStatus?.profile?.cached && cacheStatus.profile.name">
                <tr>
                  <td class="label">Profile Name</td>
                  <td class="value">{{ cacheStatus.profile.name }}</td>
                </tr>
                <tr v-if="cacheStatus.metadata?.system?.profileVersion">
                  <td class="label">Version</td>
                  <td class="value">{{ cacheStatus.metadata.system.profileVersion }}</td>
                </tr>
                <tr v-if="cacheStatus.metadata?.system?.sampleRate">
                  <td class="label">Sample Rate</td>
                  <td class="value">{{ cacheStatus.metadata.system.sampleRate.toLocaleString() }} Hz</td>
                </tr>
                <tr v-if="programChecksum?.checksum">
                  <td class="label">Program Checksum</td>
                  <td class="value">{{ programChecksum.checksum }}</td>
                </tr>
              </template>
              <template v-else-if="programChecksum?.checksum">
                <tr>
                  <td class="label">Program Checksum</td>
                  <td class="value">{{ programChecksum.checksum }}</td>
                </tr>
              </template>
              <template v-else>
                <tr>
                  <td class="label">Status</td>
                  <td class="value">No DSP profile information available</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Available DSP Profiles Section -->
        <div class="dsp-profiles mt-5">
          <div class="profiles-header">
            <h2>Available DSP Profiles for {{ soundcardDisplayName }}</h2>
          </div>

          <div v-if="dspLoading || soundcardLoading || metadataLoading || cacheLoading || profilesLoading || programChecksumLoading" class="d-flex align-items-center justify-content-center py-5">
            <div class="spinner-border spinner-border-sm me-2" role="status"></div>
            <span>Detecting sound card and DSP hardware...</span>
          </div>

          <div v-else-if="profilesList.length" class="profiles-list">
            <div
              v-for="profile in profilesList"
              :key="profile.filename"
              class="card profile-card"
              :class="{ 'installed-profile': profile.isInstalled }"
              @click="openDeployModal(profile)"
            >
              <div class="profile-item">
                <div class="profile-main">
                  <div class="profile-info">
                    <AppIcon icon="tabler/speaker" class="profile-icon" />
                    <div class="profile-details">
                      <h3>{{ profile.profileName }}</h3>
                      <div class="profile-version">
                        <span class="version-badge">v{{ profile.profileVersion }}</span>
                        <span class="checksum-badge" :class="{ 'installed-checksum': profile.isInstalled }">
                          {{ profile.checksum || 'N/A' }}
                        </span>
                        <span v-if="profile.isInstalled" class="installed-badge">Installed</span>
                      </div>
                    </div>
                  </div>
                  <div class="profile-actions">
                    <AppIcon icon="tabler/download" class="deploy-icon" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="card">
            <div class="card-body">
              <div class="empty">
                <div class="empty-icon">
                  <AppIcon icon="tabler/folder" size="3rem" />
                </div>
                <p v-if="detectedModelName" class="empty-title">No compatible profiles found</p>
                <p v-else class="empty-title">No profiles available</p>
                <p v-if="detectedModelName" class="empty-subtitle text-muted">
                  No DSP profiles are available for {{ detectedModelName }}.
                </p>
                <p v-else class="empty-subtitle text-muted">
                  No DSP profiles are currently available. Check your profile directory or upload new profiles.
                </p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
    </div>

    <!-- Deploy Profile Confirmation Dialog -->
    <AppConfirmationDialog
      :isOpen="showDeployModal"
      :title="deployModalTitle"
      :message="deployModalMessage"
      :confirmButtonText="deployResult ? 'OK' : (isDeploying ? 'Deploying...' : 'Deploy Profile')"
      :isDangerous="deployResult ? deployResult.success === false : false"
      :disabled="isDeploying"
      :icon="deployResult ? (deployResult.success ? 'tabler/check' : 'tabler/x') : 'tabler/download'"
      :hideCancelButton="!!deployResult"
      @close="closeDeployModal"
      @confirm="deployProfile"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import AppBackRouter from '@/components/app-back-router.vue'
import AppConfirmationDialog from '@/components/app-confirmation-dialog.vue'
import { type DetectedDSP, getMetadata, type DSPMetadata, getCacheStatus, type CacheStatus, getDSPProfilesMetadata, type DSPProfilesMetadataResponse, getDSPProgramChecksum, type DSPProgramChecksumResponse, updateDSPProfile, type DSPProfile } from '@/api/dsptoolkit'
import { detectSoundCard, type SoundCardDetectionResponse } from '@/api/system'
import { useDSPToolkitStore } from '@/stores/dsp-toolkit'

// Stores
const dspToolkitStore = useDSPToolkitStore()

// State
const dspLoading = ref(false)
const dspError = ref<string>('')
const detectedDSP = ref<DetectedDSP | null>(null)
const soundcardDetection = ref<SoundCardDetectionResponse | null>(null)
const soundcardLoading = ref(false)
const metadata = ref<DSPMetadata | null>(null)
const metadataLoading = ref(false)
const cacheStatus = ref<CacheStatus | null>(null)
const cacheLoading = ref(false)
const profilesMetadata = ref<DSPProfilesMetadataResponse | null>(null)
const profilesLoading = ref(false)
const programChecksum = ref<DSPProgramChecksumResponse | null>(null)
const programChecksumLoading = ref(false)

// Deploy modal state
const showDeployModal = ref(false)
const selectedProfileForDeploy = ref<(DSPProfile & { filename: string }) | null>(null)
const isDeploying = ref(false)
const deployResult = ref<{ success: boolean; message: string } | null>(null)

// Computed properties
const soundcard = computed(() => {
  return soundcardDetection.value?.data?.card_name || null
})

const soundcardDisplayName = computed(() => {
  const cardName = soundcard.value
  if (!cardName) return 'Unknown'

  const card = cardName.toLowerCase()
  if (card.includes('beocreate')) return 'Beocreate'
  if (card.includes('dac+dsp') || card.includes('dacdsp')) return 'DAC+DSP'
  if (card.includes('dac2') && card.includes('pro')) return 'DAC2 Pro + DSP add-on'
  if (card.includes('dac2')) return 'DAC2 + DSP add-on'
  if (card.includes('dsp')) return 'DSP-enabled sound card'

  return cardName
})

const detectedModelName = computed(() => {
  const cardName = soundcard.value
  if (!cardName) return null

  const card = cardName.toLowerCase()
  if (card.includes('beocreate')) return 'Beocreate 4-Channel Amplifier'
  if (card.includes('dac+dsp') || card.includes('dacdsp')) return 'DAC+ DSP'
  if (card.includes('dac2')) return 'DSP add-on'

  return null
})

const profilesList = computed(() => {
  if (!profilesMetadata.value?.profiles) return []

  let profiles = Object.entries(profilesMetadata.value.profiles).map(([filename, profile]) => ({
    filename,
    ...profile,
    isInstalled: profile.checksum === programChecksum.value?.checksum
  }))

  // Always filter by hardware compatibility to show only compatible profiles
  if (detectedModelName.value) {
    profiles = profiles.filter(profile =>
      profile.modelName === detectedModelName.value
    )
  }

  return profiles
})

// Deploy modal computed properties
const deployModalTitle = computed(() => {
  if (deployResult.value) {
    return deployResult.value.success ? 'Deployment Successful' : 'Deployment Failed'
  }

  if (selectedProfileForDeploy.value) {
    const profile = selectedProfileForDeploy.value
    const isInstalled = profile.programChecksum === programChecksum.value
    return isInstalled
      ? `${profile.profileName} - Already Installed`
      : `Deploy ${profile.profileName}?`
  }

  return 'Deploy DSP Profile'
})

const deployModalMessage = computed(() => {
  if (deployResult.value) {
    return deployResult.value.message
  }

  if (!selectedProfileForDeploy.value) return ''

  return `Are you sure you want to deploy "${selectedProfileForDeploy.value.profileName}" (v${selectedProfileForDeploy.value.profileVersion}) to your DSP?

This will:
• Write the profile to DSP EEPROM memory
• Update the cached profile on the system
• Verify the checksum after deployment

CRITICAL WARNINGS:
• Do NOT disconnect power during programming
• Do NOT shut down the system during programming
• Programming typically takes 30-60 seconds
• The system may be unresponsive during deployment

This will overwrite the current DSP configuration.`
})

// Methods
const loadSoundcard = async () => {
  soundcardLoading.value = true

  try {
    soundcardDetection.value = await detectSoundCard()
  } catch (error) {
    console.error('Failed to detect soundcard:', error)
    soundcardDetection.value = null
  } finally {
    soundcardLoading.value = false
  }
}

const loadCacheStatus = async () => {
  cacheLoading.value = true

  try {
    // Check if DSP is available before making the call
    const canUseDSP = await dspToolkitStore.canUseDSP()
    if (!canUseDSP) {
      cacheStatus.value = null
      return
    }

    cacheStatus.value = await getCacheStatus()
  } catch (error) {
    console.error('Failed to get cache status:', error)
    cacheStatus.value = null
  } finally {
    cacheLoading.value = false
  }
}

const loadProfilesMetadata = async () => {
  profilesLoading.value = true

  try {
    // Check if DSP is available before making the call
    const canUseDSP = await dspToolkitStore.canUseDSP()
    if (!canUseDSP) {
      profilesMetadata.value = null
      return
    }

    profilesMetadata.value = await getDSPProfilesMetadata()
  } catch (error) {
    console.error('Failed to get profiles metadata:', error)
    profilesMetadata.value = null
  } finally {
    profilesLoading.value = false
  }
}

const loadMetadata = async () => {
  metadataLoading.value = true

  try {
    // Check if DSP is available before making the call
    const canUseDSP = await dspToolkitStore.canUseDSP()
    if (!canUseDSP) {
      metadata.value = null
      return
    }

    metadata.value = await getMetadata()
  } catch (error) {
    console.error('Failed to get DSP metadata:', error)
    metadata.value = null
  } finally {
    metadataLoading.value = false
  }
}

const loadProgramChecksum = async () => {
  programChecksumLoading.value = true

  try {
    // Check if DSP is available before making the call
    const canUseDSP = await dspToolkitStore.canUseDSP()
    if (!canUseDSP) {
      programChecksum.value = null
      return
    }

    programChecksum.value = await getDSPProgramChecksum()
  } catch (error) {
    console.error('Failed to get DSP program checksum:', error)
    programChecksum.value = null
  } finally {
    programChecksumLoading.value = false
  }
}

const loadDSPDetection = async () => {
  dspLoading.value = true
  dspError.value = ''

  try {
    // Use the store to check DSP status with caching
    const dspStatus = await dspToolkitStore.checkDSPStatus()

    if (dspStatus === 'backend_error') {
      dspError.value = 'HiFiBerry DSP software not available'
      detectedDSP.value = null
    } else if (dspStatus === 'yes') {
      detectedDSP.value = { detected_dsp: 'detected', status: 'detected' }
    } else {
      detectedDSP.value = { detected_dsp: 'none', status: 'not_detected' }
    }
  } catch (error) {
    console.error('Failed to detect DSP hardware:', error)
    dspError.value = error instanceof Error ? error.message : 'Unable to communicate with DSP service'
    detectedDSP.value = null
  } finally {
    dspLoading.value = false
  }
}

const loadAll = async () => {
  await Promise.all([
    loadSoundcard(),
    loadDSPDetection(),
    loadMetadata(),
    loadCacheStatus(),
    loadProfilesMetadata(),
    loadProgramChecksum()
  ])
}

// Deploy modal methods
const openDeployModal = (profile: DSPProfile & { filename: string; isInstalled?: boolean }) => {
  if (profile.isInstalled) {
    // Show a simple info modal for already installed profiles
    deployResult.value = {
      success: true,
      message: `This profile is already installed and active on your DSP.

Profile: ${profile.profileName} (v${profile.profileVersion})
Checksum: ${profile.checksum}

No action is needed.`
    }
    showDeployModal.value = true
    return
  }

  selectedProfileForDeploy.value = profile
  showDeployModal.value = true
}

const closeDeployModal = () => {
  if (!isDeploying.value) {
    showDeployModal.value = false
    selectedProfileForDeploy.value = null
    deployResult.value = null
  }
}

const deployProfile = async () => {
  if (!selectedProfileForDeploy.value || isDeploying.value) return

  // If showing result, close the modal
  if (deployResult.value) {
    closeDeployModal()
    return
  }

  isDeploying.value = true

  try {
    // Get the filepath - use the full server path from the profile metadata
    const profile = selectedProfileForDeploy.value as DSPProfile & { filename: string }
    const filepath = profile._system?.filepath || profile.filename

    if (!filepath) {
      throw new Error('Profile filepath not available')
    }

    // Deploy the profile using the server filepath
    const result = await updateDSPProfile({ file: filepath })

    console.log('Profile deployed successfully:', result)

    // Show success message in modal
    if (result.status === 'success') {
      deployResult.value = {
        success: true,
        message: `Profile deployed successfully!

${result.message}

Checksum verification: ${result.checksum?.match ? 'Passed' : 'Failed'}

The DSP profile has been successfully written to EEPROM memory and is now active.`
      }
    }

    // Refresh the cache status and program checksum to show the new profile
    await Promise.all([
      loadCacheStatus(),
      loadProgramChecksum()
    ])

  } catch (error) {
    console.error('Failed to deploy DSP profile:', error)

    // Provide detailed error feedback in modal
    let errorMessage = 'Failed to deploy DSP profile'

    if (error instanceof Error) {
      errorMessage += `:\n\n${error.message}`

      // Check if it's a network/API error
      if (error.message.includes('fetch')) {
        errorMessage += '\n\nCheck that the DSP service is running and accessible.'
      }
    } else {
      errorMessage += ':\n\nUnknown error occurred'
    }

    deployResult.value = {
      success: false,
      message: errorMessage
    }
  } finally {
    isDeploying.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadAll()
})
</script>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;

.dsp-programs {
  .breadcrumbs {
    margin-bottom: 32px;
  }

  .dsp-programs-header {
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
}

/* Cards spacing to match players page */
.dsp-programs-content {
  .card {
    @include service-card-base;
  }
}

/* Custom alert styles for better visual hierarchy */
.alert {
  border: none;
  border-radius: 8px;
}

.alert-success {
  background-color: var(--tblr-success-lt, #d1e7dd);
  color: var(--tblr-success-fg, #0f5132);
}

.alert-warning {
  background-color: var(--tblr-warning-lt, #fff3cd);
  color: var(--tblr-warning-fg, #664d03);
}

.alert-danger {
  background-color: var(--tblr-danger-lt, #f8d7da);
  color: var(--tblr-danger-fg, #721c24);
}

.alert ul {
  padding-left: 1.5rem;
}

.alert-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

/* DSP Profiles Section Styles */
.dsp-profiles {
  .profiles-header {
    padding-top: 25px;
    margin-bottom: 32px;

    h3 {
      margin: 0 0 8px 0;
      color: var(--color-head);
      font-size: 1.25rem;
      font-weight: 600;
      line-height: 1.2;
    }
  }
}

.profiles-list {
  .card {
    @include service-card-base;
    border: 1px solid var(--tblr-border-color, #dee2e6);
    border-radius: 8px;
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--tblr-primary, #206bc4);
      box-shadow: 0 2px 8px rgba(32, 107, 196, 0.1);
    }

    &.profile-card {
      cursor: pointer;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(32, 107, 196, 0.15);
      }

      &.installed-profile {
        background: var(--tblr-secondary-lt, #f8f9fa);
        border-color: var(--tblr-secondary, #6c757d);

        &:hover {
          background: var(--tblr-secondary-lt, #f8f9fa);
          border-color: var(--tblr-secondary, #6c757d);
          transform: none;
          box-shadow: 0 2px 8px rgba(108, 117, 125, 0.1);
        }
      }
    }
  }

  .profile-item {
    @include service-item-base;

    .profile-main {
      @include service-main-layout;
    }

    .profile-info {
      @include service-info-layout;

      .profile-icon {
        @include service-icon-base;
        width: 2.5rem;
        height: 2.5rem;
        color: var(--color-body-secondary);
        flex-shrink: 0;
      }

      .profile-details {
        @include service-details-base;

        h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--tblr-body-color, #1e293b);
          line-height: 1.25;
        }
      }
    }

    .profile-version {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;

      .checksum-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        font-weight: 500;
        line-height: 1;
        font-family: 'Courier New', monospace;
        color: var(--tblr-muted, #6c757d);
        background-color: var(--tblr-gray-100, #f8f9fa);
        border-radius: 4px;
        letter-spacing: 0.5px;

        &.installed-checksum {
          color: var(--tblr-primary, #206bc4);
          background-color: var(--tblr-primary-lt, #dae8f5);
        }
      }
    }

    .version-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1;
      color: var(--tblr-success, #2fb344);
      background-color: var(--tblr-success-lt, #d1e7dd);
      border-radius: 4px;
    }

    .installed-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1;
      color: var(--tblr-primary, #206bc4);
      background-color: var(--tblr-primary-lt, #dae8f5);
      border-radius: 4px;
    }

    .profile-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;

      .deploy-icon {
        width: 1.25rem;
        height: 1.25rem;
        color: var(--tblr-primary, #206bc4);
        opacity: 0.7;
        transition: opacity 0.2s ease;
      }
    }

    &:hover .profile-actions .deploy-icon {
      opacity: 1;
    }
  }
}

// Info table styles matching system-info page
.info-card {
  background: var(--background-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 24px;

  .card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;

    .card-icon {
      width: 20px;
      height: 20px;
      color: var(--color-primary);
    }

    h2 {
      margin: 0;
      color: var(--color-head);
      font-size: 1.25rem;
      font-weight: 600;
    }
  }

  .info-table {
    width: 100%;
    border-collapse: collapse;

    tbody {
      tr {
        border-bottom: 1px solid var(--color-border);

        &:last-child {
          border-bottom: none;
        }

        td {
          padding: 5px 0;
          vertical-align: top;

          &.label {
            font-weight: 500;
            color: var(--color-body-secondary);
            width: 40%;
            padding-right: 16px;
            vertical-align: top;
            line-height: 1.5;
          }

          &.value {
            color: var(--color-body);
            font-family: 'Metropolis', sans-serif;
            vertical-align: top;
            line-height: 1.5;
          }
        }
      }
    }
  }
}
</style>
