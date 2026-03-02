<template>
  <PageContent>
    <div class="page-header">
      <BackRouter :to="{name: 'services'}">
        System Information
      </BackRouter>
      <div
        class="auto-update-indicator"
        :class="{
          'countdown-low': countdownSeconds <= 10 && isAutoUpdateEnabled && !isAutoUpdatePaused,
          'paused': isAutoUpdatePaused,
          'disabled': !isAutoUpdateEnabled,
          'clickable': true
        }"
        @click="toggleAutoUpdate"
        title="Click to toggle auto-update"
      >
        <Icon icon="tabler/activity" :width="16" :height="16" />
        <span v-if="isAutoUpdatePaused">Auto-update paused</span>
        <span v-else-if="!isAutoUpdateEnabled">Click to enable auto-update</span>
        <span v-else>Auto-update in {{ countdownSeconds }}s</span>
      </div>
    </div>

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
            <Icon icon="tabler/device-desktop" class="card-icon" />
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
                      <Icon icon="tabler/edit" :width="16" :height="16" />
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
                        <Icon icon="tabler/check" :width="16" :height="16" />
                      </button>
                      <button
                        @click="cancelEditingHostname"
                        class="cancel-button"
                        :disabled="savingHostname"
                        title="Cancel"
                      >
                        <Icon icon="tabler/x" :width="16" :height="16" />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td class="label">Model</td>
                <td class="value">{{ systemInfo.pi_model.name }}</td>
              </tr>
              <tr v-if="systemInfo.pi_model.memory">
                <td class="label">Memory</td>
                <td class="value">{{ systemInfo.pi_model.memory.total_gb }} GB</td>
              </tr>
              <tr>
                <td class="label">System UUID</td>
                <td class="value uuid">{{ systemInfo.system.uuid }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Network Configuration -->
        <div class="info-card">
          <div class="card-header">
            <Icon icon="tabler/wifi" class="card-icon" />
            <h2>Network</h2>
          </div>
          <div v-if="networkLoading" class="loading-message">
            Loading network configuration...
          </div>
          <div v-else-if="networkError" class="error-message">
            {{ networkError }}
          </div>
          <table v-else-if="networkConfig" class="info-table">
            <tbody>
              <tr v-if="networkConfig.hostname">
                <td class="label">Hostname</td>
                <td class="value">{{ networkConfig.hostname }}</td>
              </tr>
              <tr v-if="networkConfig.default_gateway">
                <td class="label">Gateway</td>
                <td class="value">{{ networkConfig.default_gateway }}</td>
              </tr>
              <tr v-if="networkConfig.dns_servers && networkConfig.dns_servers.length > 0">
                <td class="label">DNS Servers</td>
                <td class="value">{{ networkConfig.dns_servers.join(', ') }}</td>
              </tr>
              <tr v-if="networkConfig.interfaces && networkConfig.interfaces.length > 0">
                <td class="label">Interfaces</td>
                <td class="value">
                  <div v-for="iface in networkConfig.interfaces" :key="iface.name" class="interface-info">
                    <div class="interface-header">
                      <strong>{{ iface.name }}</strong>
                      <span class="interface-type">({{ iface.type }})</span>
                      <span :class="['status-badge', {
                        'green': iface.state === 'up',
                        'red': iface.state === 'down',
                        'gray': iface.state !== 'up' && iface.state !== 'down'
                      }]">
                        {{ iface.state }}
                      </span>
                    </div>
                    <div v-if="iface.ipv4" class="interface-details">
                      IP: {{ iface.ipv4 }}
                      <span v-if="iface.netmask"> / {{ iface.netmask }}</span>
                    </div>
                    <div v-if="iface.mac" class="interface-details">
                      MAC: {{ iface.mac }}
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- HAT Information -->
        <div class="info-card">
          <div class="card-header">
            <Icon icon="tabler/circuit-board" class="card-icon" />
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
            <Icon icon="tabler/volume" class="card-icon" />
            <h2>Sound Card</h2>
          </div>
          <table class="info-table">
            <tbody>
              <tr>
                <td class="label">Name</td>
                <td class="value">
                  <div class="soundcard-display">
                    <span v-if="!systemInfo.soundcard.fixedInConfigTxt">{{ getSoundCardDisplayName(systemInfo.soundcard) }}</span>
                    <span v-else>
                      {{ transformSoundCardName(systemInfo.soundcard.name) }}
                      (<router-link to="/services/system-tools" class="config-link">config.txt</router-link>)
                    </span>
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

        <!-- Volume Control Information -->
        <div class="info-card">
          <div class="card-header">
            <Icon icon="tabler/volume" class="card-icon" />
            <h2>Volume Control</h2>
          </div>
          <div v-if="volumeLoading" class="loading-message">
            Loading volume information...
          </div>
          <div v-else-if="volumeError" class="error-message">
            {{ volumeError }}
          </div>
          <div v-else-if="!volumeInfo || !volumeInfo.available" class="info-message">
            Volume control not available
          </div>
          <table v-else class="info-table">
            <tbody>
              <tr v-if="volumeInfo.control_info">
                <td class="label">Control Name</td>
                <td class="value">{{ volumeInfo.control_info.display_name }}</td>
              </tr>
              <tr v-if="volumeInfo.current_state">
                <td class="label">Main Volume</td>
                <td class="value">
                  <span>{{ Math.round(volumeInfo.current_state.percentage) }}%</span>
                  <span v-if="volumeInfo.current_state.decibels !== undefined">
                    ({{ volumeInfo.current_state.decibels > 0 ? '+' : '' }}{{ Math.round(volumeInfo.current_state.decibels) }} dB)
                  </span>
                </td>
              </tr>
              <tr v-if="volumeInfo.control_info?.decibel_range">
                <td class="label">Range</td>
                <td class="value">
                  {{ Math.round(volumeInfo.control_info.decibel_range.min_db) }} dB to {{ Math.round(volumeInfo.control_info.decibel_range.max_db) }} dB
                </td>
              </tr>
              <tr>
                <td class="label">Change Monitoring</td>
                <td class="value">{{ volumeInfo.supports_change_monitoring ? 'Yes' : 'No' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- DSP Program Information -->
        <div class="info-card">
          <div class="card-header">
            <Icon icon="tabler/cpu" class="card-icon" />
            <h2>DSP Program</h2>
          </div>
          <div v-if="dspProgramLoading" class="loading-message">
            Loading DSP program information...
          </div>
          <div v-else-if="dspProgramError" class="info-message">
            {{ dspProgramError }}
          </div>
          <table v-else-if="dspProgramInfo" class="info-table">
            <tbody>
              <tr>
                <td class="label">Program Length</td>
                <td class="value">{{ dspProgramInfo.program_length }} bytes</td>
              </tr>
              <tr v-if="dspProgramInfo.program_length > 0 && dspProgramInfo.checksums?.md5">
                <td class="label">MD5 Checksum</td>
                <td class="value uuid">{{ formatChecksum(dspProgramInfo.checksums.md5) }}</td>
              </tr>
              <tr v-if="dspProgramInfo.program_length > 0 && dspProgramInfo.checksums?.sha1">
                <td class="label">SHA1 Checksum</td>
                <td class="value uuid">{{ formatChecksum(dspProgramInfo.checksums.sha1) }}</td>
              </tr>
              <tr v-if="dspProgramInfo.program_length > 0 && !dspProgramInfo.checksums?.md5 && !dspProgramInfo.checksums?.sha1">
                <td class="label">Checksums</td>
                <td class="value">Not available</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="info-message">
            DSP program information not available
          </div>
        </div>

        <!-- Favourites Information -->
        <div class="info-card">
          <div class="card-header">
            <Icon icon="tabler/heart" class="card-icon" />
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
                    <span :class="['status-badge', {
                      'green': getProviderStatusClass(provider) === 'status-active',
                      'orange': getProviderStatusClass(provider) === 'status-inactive',
                      'red': getProviderStatusClass(provider) === 'status-disabled'
                    }]">
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
            <Icon icon="tabler/stack" class="card-icon" />
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

        <!-- Library Statistics -->
        <div class="info-card">
          <div class="card-header">
            <Icon icon="tabler/music" class="card-icon" />
            <h2>Music Library</h2>
          </div>
          <div v-if="libraryStatsLoading" class="loading-message">
            Loading library statistics...
          </div>
          <div v-else-if="libraryStatsError" class="error-message">
            {{ libraryStatsError }}
          </div>
          <div v-else-if="libraryStats.length === 0" class="error-message">
            No library loaded
          </div>
          <table v-else class="info-table">
            <tbody>
              <template v-for="lib in libraryStats" :key="lib.player_name">
                <tr v-if="libraryStats.length > 1">
                  <td class="label" colspan="2"><strong>{{ lib.player_name }}</strong></td>
                </tr>
                <tr>
                  <td class="label">Artists</td>
                  <td class="value">{{ lib.artists_count.toLocaleString() }}</td>
                </tr>
                <tr>
                  <td class="label">Albums</td>
                  <td class="value">{{ lib.albums_count.toLocaleString() }}</td>
                </tr>
                <tr>
                  <td class="label">Tracks</td>
                  <td class="value">{{ lib.tracks_count.toLocaleString() }}</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Cache Statistics -->
        <div class="info-card">
          <div class="card-header">
            <Icon icon="tabler/database" class="card-icon" />
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

        <!-- Background Services -->
        <div class="info-card">
          <div class="card-header">
            <Icon icon="tabler/server" class="card-icon" />
            <h2>Background Services</h2>
          </div>
          <div v-if="backgroundServicesLoading" class="loading-message">
            Checking background services...
          </div>
          <div v-else-if="backgroundServicesError" class="error-message">
            {{ backgroundServicesError }}
          </div>
          <table v-else-if="backgroundServices.length > 0" class="info-table">
            <tbody>
              <tr v-for="service in backgroundServices" :key="service.name">
                <td class="label">{{ service.name }}</td>
                <td class="value">
                  <div class="service-info">
                    <span v-if="service.status === 'available' && service.version" class="version-info">
                      {{ service.version }}
                    </span>
                    <span v-else-if="service.status === 'available'" class="service-status status-available">
                      Available
                    </span>
                    <span v-else-if="service.status === 'unknown'" class="service-status status-unknown">
                      Unknown
                    </span>
                    <span v-else :class="['service-status', `status-${service.status}`]">
                      {{ service.status === 'unavailable' ? 'Unavailable' : 'Checking...' }}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Background Jobs -->
        <div class="info-card">
          <div class="card-header">
            <Icon icon="tabler/activity" class="card-icon" />
            <h2>Background Jobs</h2>
          </div>
          <div v-if="jobsLoading" class="loading-message">
            Loading background jobs...
          </div>
          <div v-else-if="jobsError" class="error-message">
            {{ jobsError }}
          </div>
          <div v-else-if="backgroundJobs?.success && sortedBackgroundJobs.length === 0" class="loading-message">
            No background jobs found
          </div>
          <div v-else-if="backgroundJobs && !backgroundJobs.success" class="error-message">
            Failed to load background jobs: {{ backgroundJobs.message || 'Unknown error' }}
          </div>
          <table v-else-if="backgroundJobs?.success && sortedBackgroundJobs.length > 0" class="info-table">
            <tbody>
              <tr v-for="job in sortedBackgroundJobs" :key="job.id">
                <td class="label">{{ job.name }}</td>
                <td class="value">
                  <div class="job-info">
                    <div class="job-header">
                      <span :class="['status-badge', {
                        'green': getJobStatus(job) === 'running' || getJobStatus(job) === 'finished' || getJobStatus(job) === 'completed',
                        'red': getJobStatus(job) === 'failed'
                      }]">
                        {{ formatJobStatus(getJobStatus(job)) }}
                      </span>
                      <span class="job-time">
                        {{ formatJobTime(job) }}
                      </span>
                    </div>
                    <div v-if="job.progress && getJobStatus(job) === 'running'" class="job-progress-text">
                      {{ job.progress }}
                    </div>
                    <div v-if="getJobStatus(job) === 'running'" class="job-status-line">
                      <span v-if="job.completion_percentage !== null" class="progress-percentage">
                        {{ Math.round(job.completion_percentage) }}%
                      </span>
                      <span class="job-duration">
                        running for {{ formatDuration(job.duration_seconds) }}
                      </span>
                    </div>
                    <div v-else-if="getJobStatus(job) === 'finished' || getJobStatus(job) === 'completed'" class="job-status-line">
                      <span class="job-duration">
                        completed in {{ formatDuration(job.finish_time ? (job.finish_time - job.start_time) : job.duration_seconds) }}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- I2C Devices -->
        <div class="info-card">
          <div class="card-header">
            <Icon icon="tabler/binary" class="card-icon" />
            <h2>I2C Devices</h2>
          </div>
          <div v-if="i2cLoading" class="loading-message">
            Loading I2C devices...
          </div>
          <div v-else-if="i2cError" class="error-message">
            {{ i2cError }}
          </div>
          <table v-else-if="i2cDevices" class="info-table">
            <tbody>
              <tr v-if="i2cDevices.kernel_used && i2cDevices.kernel_used.length > 0">
                <td class="label">Kernel</td>
                <td class="value">
                  <div class="i2c-addresses">
                    <span v-for="addr in i2cDevices.kernel_used" :key="addr" class="status-badge orange">
                      {{ addr }}
                    </span>
                  </div>
                </td>
              </tr>
              <tr v-if="i2cDevices.detected_devices && i2cDevices.detected_devices.length > 0">
                <td class="label">Other</td>
                <td class="value">
                  <div class="i2c-addresses">
                    <span v-for="addr in i2cDevices.detected_devices" :key="addr" class="status-badge green">
                      {{ addr }}
                    </span>
                  </div>
                </td>
              </tr>
              <tr v-else-if="i2cDevices.bus_exists !== false">
                <td class="label">Other</td>
                <td class="value">No devices detected</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- File Existence -->
        <div class="info-card">
          <div class="card-header">
            <Icon icon="tabler/file-text" class="card-icon" />
            <h2>System Files</h2>
          </div>
          <div v-if="fileExistenceLoading" class="loading-message">
            Checking files...
          </div>
          <div v-else-if="fileExistenceError" class="error-message">
            {{ fileExistenceError }}
          </div>
          <table v-else-if="fileExistence && fileExistence.length > 0" class="info-table">
            <tbody>
              <tr v-for="file in fileExistence" :key="file.path">
                <td class="label">{{ file.filename }}</td>
                <td class="value">
                  <span :class="['status-badge', file.exists ? 'green' : 'red']">
                    {{ file.exists ? 'EXISTS' : 'MISSING' }}
                  </span>
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
          <Icon icon="tabler/bell" class="warning-icon" />
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
            @click="cancelSoundCardWarning"
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
          <Icon icon="tabler/check" class="success-icon" />
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
  </PageContent>
</template>

<script setup lang="ts">
import BackRouter from '@/components/BackRouter.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Icon from '@/components/Icon.vue'
import PageContent from '@/components/PageContent.vue'
import {
  getSystemInfo,
  updateHostname,
  getSoundCards,
  setSoundCardDtoverlay,
  rebootSystem,
  getCacheStats,
  getBackgroundJobs,
  type SystemInfo,
  type SoundCard,
  type CacheStatsResponse,
  type BackgroundJobsResponse,
  type BackgroundJob,
  checkFileExistence,
  type FileExistence
} from '@/api/system'
import { getNetworkConfiguration, scanI2CDevices, type NetworkConfiguration, type I2CDeviceInfo } from '@/api/config'
import { getVolumeInfo, type VolumeInfo } from '@/api/volume'
import { getDSPProgramInfo, type DSPProgramInfo } from '@/api/dsptoolkit'
import { useEditableText } from '@/composables/useEditableField'
import { useFavouritesInfo } from '@/composables/useFavouritesInfo'
import { getCoverArtMethods, type CoverArtMethodsResponse } from '@/api/coverart'
// TODO: Update to use new PipeWire API
// import { listPipewireDevices, getPipewireMonoStereo, getPipewireBalance, type PipewireDevices } from '@/api/pipewire'
import { getVersion as getPipewireVersion } from '@/api/pipewire'
import { useAppConfigStore } from '@/stores/appconfig'
import { useSettingsStore } from '@/stores/settings'
import { getAllLibraryStats, type LibraryStatsResponse } from '@/api/audiocontrol-library'

// State
const loading = ref(true)
const error = ref('')
const systemInfo = ref<SystemInfo | null>(null)

// Volume info state
const volumeInfo = ref<VolumeInfo | null>(null)
const volumeLoading = ref(false)
const volumeError = ref('')

// DSP program info state
const dspProgramInfo = ref<DSPProgramInfo | null>(null)
const dspProgramLoading = ref(false)
const dspProgramError = ref('')

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

// Network configuration state
const networkLoading = ref(true)
const networkError = ref('')
const networkConfig = ref<NetworkConfiguration | null>(null)

// I2C devices state
const i2cLoading = ref(true)
const i2cError = ref('')
const i2cDevices = ref<I2CDeviceInfo | null>(null)

// File existence state
const fileExistenceLoading = ref(true)
const fileExistenceError = ref('')
const fileExistence = ref<FileExistence[]>([])

const filesToCheck = [
  '/etc/uuid',
  '/etc/hifiberry.user'
]

// Library stats state
const libraryStatsLoading = ref(true)
const libraryStatsError = ref('')
const libraryStats = ref<LibraryStatsResponse[]>([])

const fetchLibraryStats = async () => {
  libraryStatsLoading.value = true
  libraryStatsError.value = ''
  try {
    libraryStats.value = await getAllLibraryStats()
  } catch (err) {
    libraryStatsError.value = err instanceof Error ? err.message : 'Failed to retrieve library statistics'
  } finally {
    libraryStatsLoading.value = false
  }
}

// Pipewire devices state - TODO: Update to use new PipeWire API
const pipewireLoading = ref(true)
const pipewireError = ref('')
// const pipewireDevices = ref<PipewireDevices | null>(null)
const pipewireDevices = ref<any>(null)
const pipewireMonoStereo = ref<string | null>(null)
const pipewireBalance = ref<number | null>(null)

// Background services state
interface BackgroundService {
  name: string
  url: string
  status: 'available' | 'unavailable' | 'checking' | 'unknown'
  responseTime?: number
  lastChecked?: Date
  version?: string
}

const backgroundServicesLoading = ref(true)
const backgroundServicesError = ref('')
const backgroundServices = ref<BackgroundService[]>([])

// Computed ref for hostname
const currentHostname = computed(() => systemInfo.value?.system?.pretty_hostname)

// Computed ref for sorted background jobs (newest first)
const sortedBackgroundJobs = computed(() => {
  if (!backgroundJobs.value?.jobs) return []

  return [...backgroundJobs.value.jobs].sort((a, b) => {
    // Get the latest timestamp for each job (finish_time if available, otherwise last_update)
    const aLatest = a.finish_time || a.last_update
    const bLatest = b.finish_time || b.last_update

    // Sort by latest timestamp descending (newest first)
    return bLatest - aLatest
  })
})

// Helper function to determine job status when not provided by API
const getJobStatus = (job: BackgroundJob): string => {
  if (job.status) return job.status

  // Fallback logic when status is not provided by API
  if (job.finish_time) {
    return job.completion_percentage === 100 ? 'completed' : 'finished'
  }
  return 'running'
}

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

// Get sound card display name with config.txt suffix if manually configured
const getSoundCardDisplayName = (soundcard: any): string => {
  const baseName = transformSoundCardName(soundcard.name)

  // Show (config.txt) suffix if card is fixed in config.txt and working
  // This indicates the card is loaded from config.txt
  if (soundcard.fixedInConfigTxt === true) {
    return `${baseName} (config.txt)`
  }

  return baseName
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

// Format checksum with dashes for better readability
const formatChecksum = (checksum: string): string => {
  // Add dashes every 8 characters for MD5/SHA1 checksums
  return checksum.replace(/(.{8})/g, '$1-').slice(0, -1)
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

// Format job status for display
const formatJobStatus = (status: string): string => {
  switch (status) {
    case 'running':
      return 'Running'
    case 'finished':
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

// Format job time display (relative time)
const formatJobTime = (job: BackgroundJob): string => {
  const jobStatus = getJobStatus(job)

  if (job.finish_time) {
    return `finished ${formatRelativeTime(job.finish_time)}`
  } else if (jobStatus === 'running') {
    return `started ${formatRelativeTime(job.start_time)}`
  } else {
    // For finished jobs without finish_time, use last_update
    return `updated ${formatRelativeTime(job.last_update)}`
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
  startEditing: _startEditingHostname,
  cancelEditing: _cancelEditingHostname,
  saveEdit: _saveHostname
} = hostnameEditing

// Wrapper functions that handle auto-update pausing
const startEditingHostname = () => {
  pauseAutoUpdate()
  _startEditingHostname()
}

const cancelEditingHostname = () => {
  resumeAutoUpdate()
  _cancelEditingHostname()
}

const saveHostname = async () => {
  const result = await _saveHostname()
  resumeAutoUpdate()
  return result
}

// Soundcard editing methods
const startEditingSoundCard = async () => {
  // Show warning first before loading sound cards
  showSoundCardWarning.value = true
}

const cancelSoundCardWarning = () => {
  showSoundCardWarning.value = false
  // Make sure auto-update is not left paused if user cancels the warning
  if (isAutoUpdatePaused.value) {
    resumeAutoUpdate()
  }
}

const loadSoundCards = async () => {
  try {
    pauseAutoUpdate() // Pause auto-update when starting to edit sound card
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
    resumeAutoUpdate() // Resume auto-update if loading failed
  }
}

const cancelEditingSoundCard = () => {
  isEditingSoundCard.value = false
  selectedSoundCard.value = ''
  showSoundCardWarning.value = false
  resumeAutoUpdate() // Resume auto-update when canceling edit
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
      resumeAutoUpdate() // Resume auto-update after successful save
    } else {
      throw new Error(response.message || 'Failed to update sound card')
    }
  } catch (err) {
    console.error('Error updating sound card:', err)
    error.value = err instanceof Error ? err.message : 'Failed to update sound card'
    // Don't resume auto-update on error, keep editing mode active
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

const fetchVolumeInfo = async () => {
  volumeLoading.value = true
  volumeError.value = ''

  try {
    const data = await getVolumeInfo()
    volumeInfo.value = data
  } catch (err) {
    console.error('Error fetching volume info:', err)
    volumeError.value = err instanceof Error ? err.message : 'Failed to retrieve volume information'
  } finally {
    volumeLoading.value = false
  }
}

const fetchDSPProgramInfo = async () => {
  dspProgramLoading.value = true
  dspProgramError.value = ''

  try {
    const data = await getDSPProgramInfo()
    dspProgramInfo.value = data
  } catch (err) {
    console.error('Error fetching DSP program info:', err)
    const errorMessage = err instanceof Error ? err.message : 'Failed to retrieve DSP program information'

    // Check if the error indicates no DSP detected (including connection errors when service is down)
    if (errorMessage.includes('DSP software not available') ||
        errorMessage.includes('not available') ||
        errorMessage.includes('not detected') ||
        errorMessage.includes('502') ||
        errorMessage.includes('Bad Gateway') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError')) {
      dspProgramError.value = 'No DSP hardware detected'
    } else {
      dspProgramError.value = errorMessage
    }
  } finally {
    dspProgramLoading.value = false
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

    // Validate response structure
    if (data && typeof data === 'object') {
      if (data.success === false) {
        console.warn('fetchBackgroundJobs: API returned success=false:', data.message)
      }
      if (data.jobs && Array.isArray(data.jobs)) {
        console.log(`fetchBackgroundJobs: Found ${data.jobs.length} jobs`)
        data.jobs.forEach((job, index) => {
          console.log(`Job ${index}:`, {
            id: job.id,
            name: job.name,
            status: job.status || 'no status field',
            finish_time: job.finish_time || 'no finish_time',
            start_time: job.start_time,
            last_update: job.last_update
          })
        })
      } else {
        console.warn('fetchBackgroundJobs: jobs field is not an array:', typeof data.jobs, data.jobs)
      }
    } else {
      console.error('fetchBackgroundJobs: Invalid response structure:', typeof data, data)
    }

    backgroundJobs.value = data
  } catch (err) {
    console.error('fetchBackgroundJobs: Error occurred:', err)
    jobsError.value = err instanceof Error ? err.message : 'Failed to retrieve background jobs'
  } finally {
    jobsLoading.value = false
    console.log('fetchBackgroundJobs: Completed')
  }
}

const fetchNetworkConfiguration = async () => {
  console.log('fetchNetworkConfiguration: Starting...')
  networkLoading.value = true
  networkError.value = ''

  try {
    console.log('fetchNetworkConfiguration: Calling getNetworkConfiguration API...')

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Network configuration request timeout after 10 seconds')), 10000)
    )

    const response = await Promise.race([getNetworkConfiguration(), timeoutPromise])
    console.log('fetchNetworkConfiguration: API call completed, response:', response)

    if (response.status === 'success' && response.data) {
      networkConfig.value = response.data
    } else {
      throw new Error(response.message || 'Failed to retrieve network configuration')
    }
  } catch (err) {
    console.error('fetchNetworkConfiguration: Error occurred:', err)
    networkError.value = err instanceof Error ? err.message : 'Failed to retrieve network configuration'
  } finally {
    networkLoading.value = false
    console.log('fetchNetworkConfiguration: Completed')
  }
}

const fetchI2CDevices = async () => {
  console.log('fetchI2CDevices: Starting...')
  i2cLoading.value = true
  i2cError.value = ''

  try {
    console.log('fetchI2CDevices: Calling scanI2CDevices API...')

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('I2C devices scan timeout after 10 seconds')), 10000)
    )

    const response = await Promise.race([scanI2CDevices(), timeoutPromise])
    console.log('fetchI2CDevices: API call completed, response:', response)

    if (response.status === 'success' && response.data) {
      i2cDevices.value = response.data
      console.log('fetchI2CDevices: Successfully set i2cDevices to:', i2cDevices.value)
    } else {
      throw new Error(response.message || 'Failed to scan I2C devices')
    }
  } catch (err) {
    console.error('fetchI2CDevices: Error occurred:', err)
    i2cError.value = err instanceof Error ? err.message : 'Failed to scan I2C devices'
  } finally {
    i2cLoading.value = false
    console.log('fetchI2CDevices: Completed')
  }
}

const fetchFileExistence = async () => {
  console.log('fetchFileExistence: Starting...')
  fileExistenceLoading.value = true
  fileExistenceError.value = ''

  try {
    console.log('fetchFileExistence: Calling checkFileExistence API...')

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('File existence check timeout after 10 seconds')), 10000)
    )

    const results = await Promise.race([checkFileExistence(filesToCheck), timeoutPromise])
    console.log('fetchFileExistence: API call completed, results:', results)

    fileExistence.value = results
    console.log('fetchFileExistence: Successfully set fileExistence to:', fileExistence.value)
  } catch (err) {
    console.error('fetchFileExistence: Error occurred:', err)
    fileExistenceError.value = err instanceof Error ? err.message : 'Failed to check file existence'
  } finally {
    fileExistenceLoading.value = false
    console.log('fetchFileExistence: Completed')
  }
}

const fetchPipewireDevices = async () => {
  console.log('fetchPipewireDevices: Starting...')
  pipewireLoading.value = true
  pipewireError.value = ''

  try {
    // TODO: Update to use new PipeWire API
    console.log('fetchPipewireDevices: PipeWire API not yet updated to new format')
    pipewireError.value = 'PipeWire API migration in progress'
    return

    /* OLD CODE - TODO: Update
    console.log('fetchPipewireDevices: Calling Pipewire APIs...')

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Pipewire request timeout after 10 seconds')), 10000)
    )

    // Fetch devices, monostereo mode, and balance in parallel
    const [devicesResponse, monoStereoResponse, balanceResponse] = await Promise.race([
      Promise.all([
        listPipewireDevices(),
        getPipewireMonoStereo().catch(err => {
          console.warn('getPipewireMonoStereo failed:', err)
          return { status: 'error' as const, message: 'Not available' }
        }),
        getPipewireBalance().catch(err => {
          console.warn('getPipewireBalance failed:', err)
          return { status: 'error' as const, message: 'Not available' }
        })
      ]),
      timeoutPromise
    ])

    console.log('fetchPipewireDevices: API calls completed')

    if (devicesResponse.status === 'success' && devicesResponse.data) {
      pipewireDevices.value = devicesResponse.data
      console.log('fetchPipewireDevices: Successfully set pipewireDevices to:', pipewireDevices.value)
    } else {
      throw new Error(devicesResponse.message || 'Failed to retrieve Pipewire devices')
    }
    */

    /* OLD CODE - TODO: Update
    if (monoStereoResponse.status === 'success' && monoStereoResponse.data) {
      pipewireMonoStereo.value = monoStereoResponse.data.monostereo_mode
      console.log('fetchPipewireDevices: Successfully set monoStereo to:', pipewireMonoStereo.value)
    } else {
      pipewireMonoStereo.value = null
    }

    if (balanceResponse.status === 'success' && balanceResponse.data) {
      pipewireBalance.value = balanceResponse.data.balance
      console.log('fetchPipewireDevices: Successfully set balance to:', pipewireBalance.value)
    } else {
      pipewireBalance.value = null
    }
    */
  } catch (err) {
    console.error('fetchPipewireDevices: Error occurred:', err)
    pipewireError.value = err instanceof Error ? err.message : 'Failed to retrieve Pipewire data'
  } finally {
    pipewireLoading.value = false
    console.log('fetchPipewireDevices: Completed')
  }
}

const fetchBackgroundServices = async () => {
  console.log('fetchBackgroundServices: Starting...')
  backgroundServicesLoading.value = true
  backgroundServicesError.value = ''

  try {
    const appConfigStore = useAppConfigStore()

    // Define the services to check (only those with version endpoints for now)
    const servicesToCheck = [
      {
        name: 'Web UI',
        isLocal: true
      },
      {
        name: 'Audio control',
        url: `${appConfigStore.getApiBaseUrl()}/version`
      },
      {
        name: 'Configuration',
        url: `${appConfigStore.getConfigApiBaseUrl()}/version`
      },
      {
        name: 'DSP backend',
        url: `${appConfigStore.getDSPToolkitApiBaseUrl()}/version`
      },
      {
        name: 'PipeWire API',
        url: `${window.location.origin}/api/pipewire/v1/version`,
        isPipewire: true
      },
      {
        name: 'Room EQ',
        url: `${appConfigStore.getRoomEQApiBaseUrl()}/version`
      },
      // Only include VU Meter on Pi 5 or higher
      ...(useSettingsStore().isPi5OrHigher ? [{
        name: 'VU Meter',
        url: `${window.location.origin}/api/vu-meter/api/v1/version`
      }] : []),
      {
        name: 'Web MCP',
        url: `${window.location.origin}/api/acr-webmcp/health`,
        isWebMcp: true
      }
    ]

    backgroundServices.value = []

    // Check each service
    for (const service of servicesToCheck) {
      const serviceCheck: BackgroundService = {
        name: service.name,
        url: service.url || '',
        status: 'checking'
      }

      backgroundServices.value.push(serviceCheck)

      // Handle local web interface version
      if (service.isLocal) {
        serviceCheck.version = import.meta.env.VITE_APP_VERSION
        serviceCheck.status = 'available'
        serviceCheck.lastChecked = new Date()
        console.log(`${service.name} version: ${serviceCheck.version}`)
        continue
      }

      if (!service.url) {
        serviceCheck.status = 'unavailable'
        continue
      }

      try {
        const startTime = Date.now()
        console.log(`Checking ${service.name} at ${service.url}`)

        const response = await fetch(service.url, {
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        })

        const responseTime = Date.now() - startTime
        serviceCheck.responseTime = responseTime
        serviceCheck.lastChecked = new Date()

        if (response.ok) {
          // Try to extract version information for APIs that support it
          if (service.name === 'Audio control' || service.name === 'Configuration' || service.name === 'DSP backend' || service.name === 'PipeWire API' || service.name === 'Room EQ' || service.name === 'VU Meter' || service.name === 'Web MCP') {
            try {
              const data = await response.json()
              console.log(`${service.name} response data:`, data)
              if (data && data.version) {
                serviceCheck.version = data.version
                serviceCheck.status = 'available'
                console.log(`${service.name} is available (${responseTime}ms) - Version: ${serviceCheck.version}`)
              } else {
                serviceCheck.status = 'unavailable'
                console.log(`${service.name} returned OK but no version info (${responseTime}ms) - Status: unavailable`, data)
              }
            } catch (jsonError) {
              serviceCheck.status = 'unavailable'
              console.log(`${service.name} returned OK but could not parse version info (${responseTime}ms) - Status: unavailable`, jsonError)
            }
          } else {
            serviceCheck.status = 'available'
            console.log(`${service.name} is available (${responseTime}ms)`)
          }
        } else {
          serviceCheck.status = 'unavailable'
          console.log(`${service.name} returned HTTP ${response.status}: ${response.statusText}`)
        }
      } catch (err) {
        serviceCheck.status = 'unavailable'
        serviceCheck.lastChecked = new Date()

        // Special handling for DSP backend - show "No DSP hardware detected" instead of connection error
        if (service.name === 'DSP backend') {
          serviceCheck.version = 'No DSP hardware detected'
          console.log(`${service.name}: No DSP hardware detected (service not running)`)
        } else {
          console.error(`${service.name} is unavailable:`, err)
          if (err instanceof Error) {
            console.error(`Error details for ${service.name}:`, {
              message: err.message,
              name: err.name,
              stack: err.stack
            })
          }
        }
      }
    }

    console.log('fetchBackgroundServices: All services checked')
  } catch (err) {
    console.error('fetchBackgroundServices: Error occurred:', err)
    backgroundServicesError.value = err instanceof Error ? err.message : 'Failed to check background services'
  } finally {
    backgroundServicesLoading.value = false
    console.log('fetchBackgroundServices: Completed')
  }
}

// Auto-update state
const autoUpdateInterval = ref<number | null>(null)
const countdownInterval = ref<number | null>(null)
const AUTO_UPDATE_INTERVAL = 60000 // 60 seconds in milliseconds
const AUTO_UPDATE_SECONDS = AUTO_UPDATE_INTERVAL / 1000 // Convert to seconds for countdown
const countdownSeconds = ref<number>(AUTO_UPDATE_SECONDS)
const isAutoUpdateEnabled = ref<boolean>(false) // Disabled by default
const isAutoUpdatePaused = ref<boolean>(false)

// Auto-update function to refresh data
const refreshData = async () => {
  // Skip refresh if auto-update is disabled or paused (user is editing)
  if (!isAutoUpdateEnabled.value || isAutoUpdatePaused.value) {
    console.log('System Info: Auto-refresh skipped - disabled or user is editing')
    return
  }

  console.log('System Info: Auto-refreshing data...')

  // Reset countdown to configured interval after refresh
  countdownSeconds.value = AUTO_UPDATE_SECONDS

  // Refresh all data sections in parallel
  Promise.allSettled([
    fetchSystemInfo(),
    getFavouritesInfo(),
    fetchCoverArtMethods(),
    fetchCacheStats(),
    fetchBackgroundJobs(),
    fetchNetworkConfiguration(),
    fetchI2CDevices(),
    fetchFileExistence(),
    fetchVolumeInfo(),
    fetchDSPProgramInfo(),
    fetchBackgroundServices(),
    fetchPipewireDevices()
  ]).then(results => {
    const names = ['system info', 'favourites', 'cover art', 'cache stats', 'background jobs', 'network', 'I2C devices', 'system files', 'volume info', 'DSP program info', 'background services', 'Pipewire devices']
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Auto-refresh failed for ${names[index]}:`, result.reason)
      } else {
        console.log(`Auto-refresh successful for ${names[index]}`)
      }
    })
    console.log('System Info: Auto-refresh completed')
  })
}

// Functions to control auto-update behavior
const toggleAutoUpdate = () => {
  isAutoUpdateEnabled.value = !isAutoUpdateEnabled.value

  if (isAutoUpdateEnabled.value) {
    console.log('System Info: Auto-update enabled')
    // Reset countdown when enabling
    countdownSeconds.value = AUTO_UPDATE_SECONDS

    // Start the auto-update interval if not already running
    if (!autoUpdateInterval.value) {
      autoUpdateInterval.value = window.setInterval(refreshData, AUTO_UPDATE_INTERVAL)
    }
  } else {
    console.log('System Info: Auto-update disabled')
    // Clear the interval when disabling
    if (autoUpdateInterval.value) {
      clearInterval(autoUpdateInterval.value)
      autoUpdateInterval.value = null
    }
  }
}

const pauseAutoUpdate = () => {
  console.log('System Info: Pausing auto-update (user started editing)')
  isAutoUpdatePaused.value = true
}

const resumeAutoUpdate = () => {
  console.log('System Info: Resuming auto-update (user finished editing)')
  isAutoUpdatePaused.value = false
  // Reset countdown when resuming
  if (isAutoUpdateEnabled.value) {
    countdownSeconds.value = AUTO_UPDATE_SECONDS
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
    }),
    fetchNetworkConfiguration().then(result => {
      console.log('fetchNetworkConfiguration result:', result)
      return result
    }),
    fetchI2CDevices().then(result => {
      console.log('fetchI2CDevices result:', result)
      return result
    }),
    fetchFileExistence().then(result => {
      console.log('fetchFileExistence result:', result)
      return result
    }),
    fetchVolumeInfo().then(result => {
      console.log('fetchVolumeInfo result:', result)
      return result
    }),
    fetchDSPProgramInfo().then(result => {
      console.log('fetchDSPProgramInfo result:', result)
      return result
    }),
    fetchBackgroundServices().then(result => {
      console.log('fetchBackgroundServices result:', result)
      return result
    }),
    fetchPipewireDevices().then(result => {
      console.log('fetchPipewireDevices result:', result)
      return result
    }),
    fetchLibraryStats().then(result => {
      console.log('fetchLibraryStats result:', result)
      return result
    })
  ]).then(results => {
    results.forEach((result, index) => {
      const names = ['favourites', 'cover art', 'cache stats', 'background jobs', 'network', 'I2C devices', 'file existence', 'volume info', 'DSP program info', 'background services', 'Pipewire devices', 'library stats']
      if (result.status === 'rejected') {
        console.error(`Failed to load ${names[index]}:`, result.reason)
      } else {
        console.log(`Successfully loaded ${names[index]}`)
      }
    })
    console.log('System Info: All loading completed')
  })

  // Set up countdown interval (updates every second)
  countdownInterval.value = window.setInterval(() => {
    // Don't count down if auto-update is disabled or paused
    if (!isAutoUpdateEnabled.value || isAutoUpdatePaused.value) {
      return
    }

    if (countdownSeconds.value > 0) {
      countdownSeconds.value--
    } else {
      // Reset to configured interval when it reaches 0 (will be reset again by refreshData)
      countdownSeconds.value = AUTO_UPDATE_SECONDS
    }
  }, 1000)
})

// Clean up intervals on component unmount
onUnmounted(() => {
  if (autoUpdateInterval.value) {
    console.log('System Info: Clearing auto-update interval')
    clearInterval(autoUpdateInterval.value)
    autoUpdateInterval.value = null
  }

  if (countdownInterval.value) {
    console.log('System Info: Clearing countdown interval')
    clearInterval(countdownInterval.value)
    countdownInterval.value = null
  }

  // Reset paused state on unmount
  if (isAutoUpdatePaused.value) {
    console.log('System Info: Resetting auto-update paused state on unmount')
    isAutoUpdatePaused.value = false
  }
})
</script>

<style scoped lang="scss">
@use '@/assets/scss/mixins' as *;
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;

  h1 {
    margin: 0;
    color: var(--color-head);
  }

  .auto-update-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: 20px;
    color: #16a34a;
    font-size: 0.85em;
    font-weight: 500;
    transition: all 0.3s ease;

    svg {
      opacity: 0.8;
    }

    &.countdown-low {
      background: rgba(251, 146, 60, 0.1);
      border-color: rgba(251, 146, 60, 0.3);
      color: #ea580c;
      animation: pulse-subtle 2s infinite;
    }

    &.paused {
      background: rgba(156, 163, 175, 0.1);
      border-color: rgba(156, 163, 175, 0.3);
      color: #6b7280;

      svg {
        opacity: 0.5;
      }
    }

    &.disabled {
      background: rgba(156, 163, 175, 0.1);
      border-color: rgba(156, 163, 175, 0.3);
      color: #6b7280;

      svg {
        opacity: 0.5;
      }
    }

    &.clickable {
      cursor: pointer;
      user-select: none;

      &:hover {
        background: rgba(34, 197, 94, 0.15);
        border-color: rgba(34, 197, 94, 0.3);
        transform: translateY(-1px);
      }

      &.disabled:hover {
        background: rgba(156, 163, 175, 0.15);
        border-color: rgba(156, 163, 175, 0.4);
      }
    }
  }
}

@keyframes pulse-subtle {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.02);
    opacity: 0.9;
  }
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

        &.clickable {
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            background: var(--background-card-hover);
            border-color: var(--color-primary);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
        }

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
            flex: 1;
          }

          .chevron-icon {
            width: 16px;
            height: 16px;
            color: var(--color-body-secondary);
            transition: transform 0.2s ease;
          }
        }

        &.clickable:hover .chevron-icon {
          transform: translateX(2px);
          color: var(--color-primary);
        }

        .card-description {
          p {
            margin: 0;
            color: var(--color-body-secondary);
            font-size: 0.95rem;
            line-height: 1.4;
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

  .favourites-count {
    color: var(--color-body-secondary);
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

  .job-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2px;

    .job-time {
      font-size: 0.75em;
      color: var(--color-body-secondary);
    }
  }

  .job-progress-text {
    color: var(--color-body);
    font-size: 0.875em;
    line-height: 1.3;
  }

  .job-status-line {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8em;

    .progress-percentage {
      font-weight: 600;
      color: var(--color-primary);
    }

    .job-duration {
      color: var(--color-body-secondary);
    }
  }
}

// Network interface styles
.interface-info {
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }

  .interface-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;

    .interface-type {
      font-size: 0.85em;
      color: var(--color-text-muted);
    }
  }

  .interface-details {
    font-size: 0.9em;
    color: var(--color-text-muted);
    margin-bottom: 2px;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

// I2C address styles
.i2c-addresses {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

// Pipewire devices styles
.pipewire-devices {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pipewire-link {
  color: var(--color-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;

  &:hover {
    color: var(--color-primary-dark, #1e40af);
    text-decoration: underline;
  }
}

// Config.txt link style
.config-link {
  color: var(--color-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  text-decoration: none;

  &:hover {
    color: var(--color-primary-dark, #1e40af);
    text-decoration: underline;
  }
}

// Status indicator styles
.status-enabled {
  color: #16a34a;
  font-weight: 600;
}

.status-disabled {
  color: #dc2626;
  font-weight: 600;
}

// Service status styles
.service-info {
  display: flex;
  align-items: center;
  gap: 8px;

  .service-status {
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.875em;

    &.status-available {
      background: var(--background-success, rgba(34, 197, 94, 0.1));
      color: var(--color-success, #16a34a);
    }

    &.status-unavailable {
      background: var(--background-error, rgba(239, 68, 68, 0.1));
      color: var(--color-error, #dc2626);
    }

    &.status-unknown {
      background: var(--background-warning, rgba(245, 158, 11, 0.1));
      color: var(--color-warning, #d97706);
    }

    &.status-checking {
      background: var(--background-warning, rgba(245, 158, 11, 0.1));
      color: var(--color-warning, #d97706);
    }
  }

  .response-time {
    color: var(--color-body-secondary);
    font-size: 0.8em;
  }
}

@media (max-width: 768px) {
  .system-info {
    .page-header {
      flex-direction: column;
      gap: 16px;
      align-items: flex-start;

      .auto-update-indicator {
        font-size: 0.8em;
        padding: 4px 10px;
      }
    }

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
