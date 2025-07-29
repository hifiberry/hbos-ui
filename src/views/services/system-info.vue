<template>
  <div class="system-info">
    <h1>System Information</h1>

    <div class="system-info-content">
      <div v-if="loading" class="loading-section">
        <p>Loading system information...</p>
      </div>

      <div v-else-if="error" class="error-section">
        <div class="error-content">
          <p class="error-message">{{ error }}</p>
          <button @click="fetchSystemInfo" class="retry-button">
            Retry
          </button>
        </div>
      </div>

      <div v-else-if="systemInfo" class="info-tables">
        <!-- Raspberry Pi Information -->
        <div class="info-card">
          <div class="card-header">
            <AppIcon icon="computer" class="card-icon" />
            <h2>Raspberry Pi</h2>
          </div>
          <table class="info-table">
            <tbody>
              <tr v-if="systemInfo?.system?.pretty_hostname || isEditingHostname">
                <td class="label">System Name</td>
                <td class="value">
                  <div v-if="!isEditingHostname" class="hostname-display">
                    <span>{{ systemInfo.system.pretty_hostname || 'Not set' }}</span>
                    <button
                      @click="startEditingHostname"
                      class="edit-button"
                      :disabled="loading"
                    >
                      <AppIcon icon="edit" :width="16" :height="16" />
                    </button>
                  </div>
                  <div v-else class="hostname-edit">
                    <input
                      v-model="editHostname"
                      type="text"
                      placeholder="Enter system name"
                      class="editable-input"
                      :disabled="savingHostname"
                      @keyup.enter="saveHostname"
                      @keyup.escape="cancelEditingHostname"
                    />
                    <div class="editable-actions">
                      <button
                        @click="saveHostname"
                        class="save-button"
                        :disabled="savingHostname || !editHostname.trim()"
                        :title="savingHostname ? 'Saving...' : 'Save'"
                      >
                        <AppIcon icon="checkmark" :width="16" :height="16" />
                      </button>
                      <button
                        @click="cancelEditingHostname"
                        class="cancel-button"
                        :disabled="savingHostname"
                        title="Cancel"
                      >
                        <AppIcon icon="close" :width="16" :height="16" />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td class="label">Model</td>
                <td class="value">{{ systemInfo.pi_model.name }}</td>
              </tr>
              <tr>
                <td class="label">System UUID</td>
                <td class="value uuid">{{ systemInfo.system.uuid }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- HAT Information -->
        <div class="info-card">
          <div class="card-header">
            <AppIcon icon="hifiberry" class="card-icon" />
            <h2>HAT Information</h2>
          </div>
          <table class="info-table">
            <tbody>
              <tr>
                <td class="label">Vendor</td>
                <td class="value">{{ systemInfo.hat_info.vendor }}</td>
              </tr>
              <tr>
                <td class="label">Product</td>
                <td class="value">{{ systemInfo.hat_info.product }}</td>
              </tr>
              <tr>
                <td class="label">UUID</td>
                <td class="value uuid">{{ systemInfo.hat_info.uuid }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Sound Card Information -->
        <div class="info-card">
          <div class="card-header">
            <AppIcon icon="volume" class="card-icon" />
            <h2>Sound Card</h2>
          </div>
          <table class="info-table">
            <tbody>
              <tr>
                <td class="label">Name</td>
                <td class="value">
                  <div v-if="!isEditingSoundCard" class="soundcard-display">
                    <span>{{ transformSoundCardName(systemInfo.soundcard.name) }}</span>
                    <button
                      @click="startEditingSoundCard"
                      class="edit-button"
                      :disabled="loading"
                    >
                      <AppIcon icon="edit" :width="16" :height="16" />
                    </button>
                  </div>
                  <div v-else class="soundcard-edit">
                    <select
                      v-model="selectedSoundCard"
                      class="soundcard-select"
                      :disabled="savingSoundCard"
                    >
                      <option
                        v-for="card in availableSoundCards"
                        :key="card.dtoverlay"
                        :value="card.dtoverlay"
                      >
                        {{ transformSoundCardName(card.name) }}
                      </option>
                    </select>
                    <div class="editable-actions">
                      <button
                        @click="saveSoundCard"
                        class="save-button"
                        :disabled="savingSoundCard || !selectedSoundCard"
                        :title="savingSoundCard ? 'Saving...' : 'Save'"
                      >
                        <AppIcon icon="checkmark" :width="16" :height="16" />
                      </button>
                      <button
                        @click="cancelEditingSoundCard"
                        class="cancel-button"
                        :disabled="savingSoundCard"
                        title="Cancel"
                      >
                        <AppIcon icon="close" :width="16" :height="16" />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td class="label">Volume Control</td>
                <td class="value">{{ systemInfo.soundcard.volume_control }}</td>
              </tr>
              <tr>
                <td class="label">Hardware Index</td>
                <td class="value">{{ systemInfo.soundcard.hardware_index }}</td>
              </tr>
              <tr>
                <td class="label">Channels</td>
                <td class="value">{{ systemInfo.soundcard.output_channels }} out, {{ systemInfo.soundcard.input_channels }} in</td>
              </tr>
              <tr>
                <td class="label">Card Type</td>
                <td class="value">{{ systemInfo.soundcard.card_type.join(', ') }}</td>
              </tr>
              <tr>
                <td class="label">Features</td>
                <td class="value">{{ systemInfo.soundcard.features.join(', ') }}</td>
              </tr>
              <tr>
                <td class="label">DSP Support</td>
                <td class="value">{{ systemInfo.soundcard.supports_dsp ? 'Yes' : 'No' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Favourites Information -->
        <div class="info-card">
          <div class="card-header">
            <AppIcon icon="heart" class="card-icon" />
            <h2>Favourites</h2>
          </div>
          <div v-if="favouritesLoading" class="loading-message">
            Loading favourites information...
          </div>
          <div v-else-if="favouritesError" class="error-message">
            {{ favouritesError }}
          </div>
          <table v-else-if="favouritesInfo" class="info-table">
            <tbody>
              <tr v-for="provider in favouritesInfo.providers" :key="provider.name">
                <td class="label">{{ provider.display_name || provider.name }}</td>
                <td class="value">
                  <div class="provider-info">
                    <span :class="['provider-status', getProviderStatusClass(provider)]">
                      {{ getProviderStatusText(provider) }}
                    </span>
                    <span v-if="provider.favourite_count !== null" class="favourites-count">
                      ({{ provider.favourite_count }} favourite{{ provider.favourite_count !== 1 ? 's' : '' }})
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Cover Art Providers -->
        <div class="info-card">
          <div class="card-header">
            <AppIcon icon="database_star" class="card-icon" />
            <h2>Cover Art Providers</h2>
          </div>
          <div v-if="coverArtLoading" class="loading-message">
            Loading cover art providers...
          </div>
          <div v-else-if="coverArtError" class="error-message">
            {{ coverArtError }}
          </div>
          <table v-else-if="coverArtMethods" class="info-table">
            <tbody>
              <tr v-for="method in coverArtMethods.methods.filter(m => m.method !== 'Url')" :key="method.method">
                <td class="label">{{ method.method }}</td>
                <td class="value">
                  <span class="providers-list">
                    {{ method.providers.map(p => p.display_name).join(', ') }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Cache Statistics -->
        <div class="info-card">
          <div class="card-header">
            <AppIcon icon="database" class="card-icon" />
            <h2>Cache Statistics</h2>
          </div>
          <div v-if="cacheLoading" class="loading-message">
            Loading cache statistics...
          </div>
          <div v-else-if="cacheError" class="error-message">
            {{ cacheError }}
          </div>
          <table v-else-if="cacheStats?.success" class="info-table">
            <tbody>
              <tr>
                <td class="label">Disk Entries</td>
                <td class="value">{{ cacheStats.stats.disk_entries.toLocaleString() }}</td>
              </tr>
              <tr>
                <td class="label">Memory Entries</td>
                <td class="value">{{ cacheStats.stats.memory_entries.toLocaleString() }}</td>
              </tr>
              <tr>
                <td class="label">Memory Usage</td>
                <td class="value">{{ formatBytes(cacheStats.stats.memory_bytes) }}</td>
              </tr>
              <tr>
                <td class="label">Memory Limit</td>
                <td class="value">
                  {{ cacheStats.stats.memory_limit_bytes ? formatBytes(cacheStats.stats.memory_limit_bytes) : 'No limit' }}
                </td>
              </tr>
              <tr>
                <td class="label">Image Count</td>
                <td class="value">{{ cacheStats.image_cache_stats.total_images.toLocaleString() }}</td>
              </tr>
              <tr>
                <td class="label">Image Cache Size</td>
                <td class="value">{{ formatBytes(cacheStats.image_cache_stats.total_size) }}</td>
              </tr>
              <tr>
                <td class="label">Last Updated</td>
                <td class="value">{{ formatRelativeTime(cacheStats.image_cache_stats.last_updated) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Background Jobs -->
        <div class="info-card">
          <div class="card-header">
            <AppIcon icon="activity" class="card-icon" />
            <h2>Background Jobs</h2>
          </div>
          <div v-if="jobsLoading" class="loading-message">
            Loading background jobs...
          </div>
          <div v-else-if="jobsError" class="error-message">
            {{ jobsError }}
          </div>
          <div v-else-if="backgroundJobs?.success && backgroundJobs.jobs.length === 0" class="loading-message">
            No background jobs running
          </div>
          <table v-else-if="backgroundJobs?.success && backgroundJobs.jobs.length > 0" class="info-table">
            <tbody>
              <tr v-for="job in backgroundJobs.jobs" :key="job.id">
                <td class="label">{{ job.name }}</td>
                <td class="value">
                  <div class="job-info">
                    <div class="job-progress">
                      <span v-if="job.completion_percentage !== null" class="progress-percentage">
                        {{ Math.round(job.completion_percentage) }}%
                      </span>
                      <span v-if="job.progress" class="progress-text">
                        {{ job.progress }}
                      </span>
                    </div>
                    <div class="job-timing">
                      <span class="duration">{{ formatDuration(job.duration_seconds) }}</span>
                      <span class="last-update">{{ formatRelativeTime(job.last_update) }}</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Sound Card Warning Dialog -->
    <div v-if="showSoundCardWarning" class="warning-overlay">
      <div class="warning-dialog">
        <div class="warning-header">
          <AppIcon icon="bell" class="warning-icon" />
          <h3>Warning: Sound Card Change</h3>
        </div>
        <div class="warning-content">
          <p>
            Selecting an incorrect sound card can make the system unusable and may require manual recovery.
          </p>
          <p>
            Are you sure you want to proceed?
          </p>
        </div>
        <div class="warning-actions">
          <button
            @click="showSoundCardWarning = false"
            class="warning-btn warning-btn--cancel"
          >
            Cancel
          </button>
          <button
            @click="loadSoundCards"
            class="warning-btn warning-btn--confirm"
          >
            Proceed
          </button>
        </div>
      </div>
    </div>

    <!-- Reboot Required Dialog -->
    <div v-if="showRebootDialog" class="warning-overlay">
      <div class="warning-dialog">
        <div class="warning-header">
          <AppIcon icon="checkmark" class="success-icon" />
          <h3>Sound Card Updated</h3>
        </div>
        <div class="warning-content">
          <p>
            Sound card configuration updated successfully.
          </p>
          <p>
            A reboot is required to activate the new settings.
          </p>
        </div>
        <div class="warning-actions">
          <button
            @click="showRebootDialog = false"
            class="warning-btn warning-btn--cancel"
          >
            Later
          </button>
          <button
            @click="rebootSystemHandler"
            class="warning-btn warning-btn--confirm"
            :disabled="rebooting"
          >
            {{ rebooting ? 'Rebooting...' : 'Reboot Now' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/app-icon.vue'
import {
  getSystemInfo,
  updateHostname,
  getSoundCards,
  setSoundCardDtoverlay,
  detectSoundCard,
  rebootSystem,
  executeScript,
  getCacheStats,
  getBackgroundJobs,
  type SystemInfo,
  type HostnameUpdateRequest,
  type SoundCardsResponse,
  type SoundCard,
  type SetDtoverlayRequest,
  type SoundCardDetectionResponse,
  type RebootRequest,
  type ScriptExecutionRequest,
  type CacheStatsResponse,
  type ImageCacheStats,
  type BackgroundJobsResponse,
  type BackgroundJob
} from '@/api/system'
import { useEditableText } from '@/composables/useEditableField'
import { useFavouritesInfo } from '@/composables/useFavouritesInfo'
import { getCoverArtMethods, type CoverArtMethodsResponse } from '@/api/coverart'

// State
const loading = ref(true)
const error = ref('')
const systemInfo = ref<SystemInfo | null>(null)

// Soundcard editing state
const isEditingSoundCard = ref(false)
const savingSoundCard = ref(false)
const availableSoundCards = ref<SoundCard[]>([])
const selectedSoundCard = ref('')
const showSoundCardWarning = ref(false)
const showRebootDialog = ref(false)
const rebooting = ref(false)

// Favourites composable
const {
  loading: favouritesLoading,
  error: favouritesError,
  favouritesInfo,
  getFavouritesInfo,
  getProviderStatusText,
  getProviderStatusClass
} = useFavouritesInfo()

// Cover art providers state
const coverArtLoading = ref(true)
const coverArtError = ref('')
const coverArtMethods = ref<CoverArtMethodsResponse | null>(null)

// Cache statistics state
const cacheLoading = ref(true)
const cacheError = ref('')
const cacheStats = ref<CacheStatsResponse | null>(null)

// Background jobs state
const jobsLoading = ref(true)
const jobsError = ref('')
const backgroundJobs = ref<BackgroundJobsResponse | null>(null)

// Computed ref for hostname
const currentHostname = computed(() => systemInfo.value?.system?.pretty_hostname)

// Sound card name transformation
const transformSoundCardName = (name: string): string => {
  // Transform long names to shorter versions for display
  const transformations: Record<string, string> = {
    'Beocreate 4-Channel Amplifier': 'Beocreate',
    'DAC+ Zero/Light/MiniAmp': 'DAC+ Zero'
    // Add more transformations here as needed
  }

  return transformations[name] || name
}

// Format bytes for display
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Format duration for display
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  } else {
    return `${remainingSeconds}s`
  }
}

// Format timestamp to relative time
const formatRelativeTime = (timestamp: number): string => {
  const now = Math.floor(Date.now() / 1000)
  const diff = now - timestamp

  if (diff < 60) {
    return `${diff}s ago`
  } else if (diff < 3600) {
    return `${Math.floor(diff / 60)}m ago`
  } else if (diff < 86400) {
    return `${Math.floor(diff / 3600)}h ago`
  } else {
    return `${Math.floor(diff / 86400)}d ago`
  }
}

// Hostname editing using composable
const hostnameEditing = useEditableText(
  currentHostname,
  async (newHostname: string) => {
    try {
      const response = await updateHostname({
        pretty_hostname: newHostname
      })

      if (response.status === 'success') {
        // Refresh system info to get the updated hostname
        await fetchSystemInfo()
        return { status: 'success' }
      } else {
        return { status: 'error', message: response.message || 'Failed to update system name' }
      }
    } catch (err) {
      console.error('Error updating hostname:', err)
      return {
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      }
    }
  },
  {
    minLength: 1,
    maxLength: 63,
    required: true
  }
)

// Destructure for easier use in template
const {
  isEditing: isEditingHostname,
  editValue: editHostname,
  isSaving: savingHostname,
  startEditing: startEditingHostname,
  cancelEditing: cancelEditingHostname,
  saveEdit: saveHostname
} = hostnameEditing

// Soundcard editing methods
const startEditingSoundCard = async () => {
  // Show warning first before loading sound cards
  showSoundCardWarning.value = true
}

const loadSoundCards = async () => {
  try {
    const response = await getSoundCards()
    if (response.status === 'success') {
      availableSoundCards.value = response.data.soundcards
      // Find current soundcard's dtoverlay
      const currentCard = availableSoundCards.value.find(card =>
        card.name === systemInfo.value?.soundcard.name
      )
      selectedSoundCard.value = currentCard?.dtoverlay || ''
      isEditingSoundCard.value = true
      showSoundCardWarning.value = false
    }
  } catch (err) {
    console.error('Error loading sound cards:', err)
    error.value = 'Failed to load available sound cards'
    showSoundCardWarning.value = false
  }
}

const cancelEditingSoundCard = () => {
  isEditingSoundCard.value = false
  selectedSoundCard.value = ''
  showSoundCardWarning.value = false
}

const saveSoundCard = async () => {
  if (!selectedSoundCard.value) return

  savingSoundCard.value = true
  try {
    const response = await setSoundCardDtoverlay({
      dtoverlay: selectedSoundCard.value,
      remove_existing: true
    })

    if (response.status === 'success') {
      if (response.data?.reboot_required) {
        // Show reboot required modal
        showRebootDialog.value = true
      }

      // Refresh system info
      await fetchSystemInfo()
      isEditingSoundCard.value = false
      selectedSoundCard.value = ''
    } else {
      throw new Error(response.message || 'Failed to update sound card')
    }
  } catch (err) {
    console.error('Error updating sound card:', err)
    error.value = err instanceof Error ? err.message : 'Failed to update sound card'
  } finally {
    savingSoundCard.value = false
  }
}

// Reboot system method
const rebootSystemHandler = async () => {
  rebooting.value = true
  try {
    const response = await rebootSystem({ delay: 5 })

    if (response.status === 'success') {
      // Show success message and hide dialog after a short delay
      setTimeout(() => {
        showRebootDialog.value = false
        // Optionally show a toast or notification that system is rebooting
      }, 2000)
    } else {
      throw new Error(response.message || 'Failed to reboot system')
    }
  } catch (err) {
    console.error('Error rebooting system:', err)
    error.value = err instanceof Error ? err.message : 'Failed to reboot system'
    rebooting.value = false
  }
}

// Methods
const fetchSystemInfo = async () => {
  console.log('fetchSystemInfo: Starting...')
  loading.value = true
  error.value = ''

  try {
    console.log('fetchSystemInfo: Calling getSystemInfo API...')
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000)
    )
    
    const data = await Promise.race([getSystemInfo(), timeoutPromise])
    console.log('fetchSystemInfo: API call completed, data:', data)

    if (data.status === 'success') {
      systemInfo.value = data
      console.log('fetchSystemInfo: System info set successfully')
    } else {
      error.value = data.message || 'Failed to retrieve system information'
      console.log('fetchSystemInfo: API returned error:', error.value)
    }
  } catch (err) {
    console.error('fetchSystemInfo: Error occurred:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error occurred'
  } finally {
    loading.value = false
    console.log('fetchSystemInfo: Completed')
  }
}

const fetchCoverArtMethods = async () => {
  coverArtLoading.value = true
  coverArtError.value = ''

  try {
    const data = await getCoverArtMethods()
    coverArtMethods.value = data
  } catch (err) {
    console.error('Error fetching cover art methods:', err)
    coverArtError.value = err instanceof Error ? err.message : 'Failed to retrieve cover art providers'
  } finally {
    coverArtLoading.value = false
  }
}

const fetchCacheStats = async () => {
  console.log('fetchCacheStats: Starting...')
  cacheLoading.value = true
  cacheError.value = ''

  try {
    console.log('fetchCacheStats: Calling getCacheStats API...')
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Cache stats request timeout after 10 seconds')), 10000)
    )
    
    const data = await Promise.race([getCacheStats(), timeoutPromise])
    console.log('fetchCacheStats: API call completed, data:', data)
    cacheStats.value = data
  } catch (err) {
    console.error('fetchCacheStats: Error occurred:', err)
    cacheError.value = err instanceof Error ? err.message : 'Failed to retrieve cache statistics'
  } finally {
    cacheLoading.value = false
    console.log('fetchCacheStats: Completed')
  }
}

const fetchBackgroundJobs = async () => {
  console.log('fetchBackgroundJobs: Starting...')
  jobsLoading.value = true
  jobsError.value = ''

  try {
    console.log('fetchBackgroundJobs: Calling getBackgroundJobs API...')
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Background jobs request timeout after 10 seconds')), 10000)
    )
    
    const data = await Promise.race([getBackgroundJobs(), timeoutPromise])
    console.log('fetchBackgroundJobs: API call completed, data:', data)
    backgroundJobs.value = data
  } catch (err) {
    console.error('fetchBackgroundJobs: Error occurred:', err)
    jobsError.value = err instanceof Error ? err.message : 'Failed to retrieve background jobs'
  } finally {
    jobsLoading.value = false
    console.log('fetchBackgroundJobs: Completed')
  }
}

// Lifecycle
onMounted(async () => {
  console.log('System Info: Starting to load...')
  
  // Load system info first
  await fetchSystemInfo()
  
  // Load other data in parallel but don't block the page
  Promise.allSettled([
    getFavouritesInfo().then(result => {
      console.log('getFavouritesInfo result:', result)
      return result
    }),
    fetchCoverArtMethods().then(result => {
      console.log('fetchCoverArtMethods result:', result)
      return result
    }),
    fetchCacheStats().then(result => {
      console.log('fetchCacheStats result:', result)
      return result
    }),
    fetchBackgroundJobs().then(result => {
      console.log('fetchBackgroundJobs result:', result)
      return result
    })
  ]).then(results => {
    results.forEach((result, index) => {
      const names = ['favourites', 'cover art', 'cache stats', 'background jobs']
      if (result.status === 'rejected') {
        console.error(`Failed to load ${names[index]}:`, result.reason)
      } else {
        console.log(`Successfully loaded ${names[index]}`)
      }
    })
    console.log('System Info: All loading completed')
  })
})
</script>

<style scoped lang="scss">
@use '@/assets/scss/mixins' as *;

.system-info {
  h1 {
    margin-bottom: 32px;
    color: var(--color-head);
  }

  .system-info-content {
    .loading-section {
      text-align: center;
      padding: 40px;
      color: var(--color-body-secondary);
    }

    .error-section {
      .error-content {
        background: var(--background-error);
        border: 1px solid var(--color-error);
        border-radius: 8px;
        padding: 20px;
        text-align: center;

        .error-message {
          color: var(--color-error);
          margin-bottom: 16px;
        }

        .retry-button {
          background: var(--color-error);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s ease;

          &:hover {
            background: var(--color-error-dark);
          }
        }
      }
    }

    .info-tables {
      display: grid;
      gap: 24px;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));

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
          }        .info-table {
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

                  &.uuid {
                    font-size: 0.9em;
                    word-break: break-all;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

// Hostname editing styles
.hostname-display {
  display: flex;
  align-items: center;
  min-height: 28px; // Ensure consistent height

  span {
    margin-right: 8px;
    line-height: 1.4;
  }

  .edit-button {
    @include button-icon(28px);
    color: var(--color-body-secondary);
    flex-shrink: 0;

    &:hover:not(:disabled) {
      color: var(--color-primary);
    }
  }
}

.hostname-edit {
  @include editable-field;
}

// Soundcard editing styles
.soundcard-display {
  display: flex;
  align-items: center;
  min-height: 28px; // Ensure consistent height

  span {
    margin-right: 8px;
    line-height: 1.4;
  }

  .edit-button {
    @include button-icon(28px);
    color: var(--color-body-secondary);
    flex-shrink: 0;

    &:hover:not(:disabled) {
      color: var(--color-primary);
    }
  }
}

.soundcard-edit {
  @include editable-field;

  .soundcard-select {
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--background-card);
    color: var(--color-body);
    font-family: 'Metropolis', sans-serif;
    font-size: inherit;
    min-width: 200px;
    margin-right: 8px;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

// Warning dialog styles
.warning-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  .warning-dialog {
    background: var(--background-card, #ffffff);
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 8px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);

    .warning-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;

      .warning-icon {
        width: 24px;
        height: 24px;
        color: var(--color-warning, #f59e0b);
      }

      .success-icon {
        width: 24px;
        height: 24px;
        color: var(--color-success, #10b981);
      }

      h3 {
        margin: 0;
        color: var(--color-head, #111827);
        font-size: 18px;
      }
    }

    .warning-content {
      margin-bottom: 20px;
      line-height: 1.5;
      color: var(--color-text, #374151);

      p {
        margin: 0 0 12px 0;
      }
    }

    .warning-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;

      .warning-btn {
        padding: 10px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
        transition: all 0.2s ease;
        min-width: 80px;

        &--cancel {
          background: var(--color-body-secondary, #6b7280);
          color: white;

          &:hover {
            background: var(--color-text, #374151);
          }
        }

        &--confirm {
          background: var(--color-warning, #f59e0b);
          color: white;

          &:hover:not(:disabled) {
            background: var(--color-warning-dark, #d97706);
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }
      }
    }
  }
}

// Favourites styles
.provider-info {
  display: flex;
  align-items: center;
  gap: 8px;

  .provider-status {
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.875em;

    &.status-active {
      background: var(--background-success);
      color: var(--color-success);
    }

    &.status-inactive {
      background: var(--background-warning);
      color: var(--color-warning);
    }

    &.status-disabled {
      background: var(--background-error);
      color: var(--color-error);
    }
  }

  .favourites-count {
    color: var(--color-body-secondary);
    font-size: 0.875em;
  }
}

.loading-message,
.error-message {
  padding: 16px;
  text-align: center;
  color: var(--color-body-secondary);
  font-style: italic;
}

.error-message {
  color: var(--color-error);
}

// Job info styles
.job-info {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .job-progress {
    display: flex;
    align-items: center;
    gap: 8px;

    .progress-percentage {
      font-weight: 600;
      color: var(--color-primary);
      font-size: 0.9em;
    }

    .progress-text {
      color: var(--color-body);
      font-size: 0.875em;
    }
  }

  .job-timing {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.8em;
    color: var(--color-body-secondary);

    .duration {
      font-weight: 500;
    }

    .last-update {
      font-style: italic;
    }
  }
}@media (max-width: 768px) {
  .system-info {
    .system-info-content {
      .info-tables {
        grid-template-columns: 1fr;

        .info-card {
          .info-table {
            tbody {
              tr {
                td {
                  &.label {
                    width: 35%;
                  }
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
