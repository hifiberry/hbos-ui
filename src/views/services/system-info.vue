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
                <td class="value">{{ systemInfo.soundcard.name }}</td>
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/app-icon.vue'
import { getSystemInfo, updateHostname, type SystemInfo } from '@/api/system'
import { useEditableText } from '@/composables/useEditableField'
import { useFavouritesInfo } from '@/composables/useFavouritesInfo'

// State
const loading = ref(true)
const error = ref('')
const systemInfo = ref<SystemInfo | null>(null)

// Favourites composable
const {
  loading: favouritesLoading,
  error: favouritesError,
  favouritesInfo,
  getFavouritesInfo,
  getProviderStatusText,
  getProviderStatusClass
} = useFavouritesInfo()

// Computed ref for hostname
const currentHostname = computed(() => systemInfo.value?.system?.pretty_hostname)

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

// Methods
const fetchSystemInfo = async () => {
  loading.value = true
  error.value = ''

  try {
    const data = await getSystemInfo()

    if (data.status === 'success') {
      systemInfo.value = data
    } else {
      error.value = data.message || 'Failed to retrieve system information'
    }
  } catch (err) {
    console.error('Error fetching system info:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error occurred'
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  fetchSystemInfo()
  getFavouritesInfo()
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
                padding: 12px 0;
                vertical-align: top;

                &.label {
                  font-weight: 500;
                  color: var(--color-body-secondary);
                  width: 40%;
                  padding-right: 16px;
                }

                &.value {
                  color: var(--color-body);
                  font-family: 'Metropolis', sans-serif;

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

  span {
    margin-right: 8px;
  }

  .edit-button {
    @include button-icon(28px);
    color: var(--color-body-secondary);

    &:hover:not(:disabled) {
      color: var(--color-primary);
    }
  }
}

.hostname-edit {
  @include editable-field;
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
