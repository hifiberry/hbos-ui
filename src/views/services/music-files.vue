<template>
  <PageContent title="Music Files" :backrouterLink="{ name: 'services' }">
    <div class="breadcrumbs">
      <button @click="rescanLibrary" :disabled="rescanning" class="rescan-button" title="Rescan Music Library">
        <Icon icon="refresh" />
        Rescan Library
      </button>
    </div>

    <div class="music-files-content">
      <!-- Music Files Service Information -->
      <div class="service-info-section">
        <div class="info-card">
          <div class="info-content">
            <p>
              SMB/CIFS mounts are automatically linked to <code>/var/lib/mpd/music</code> for music library access.
            </p>
            <p>
              <strong>Note:</strong> If you want to store music locally on the device, make sure to also link it to
              <code>/var/lib/mpd/music</code> to make it accessible to the music library.
            </p>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <div class="header-title">
            <h2>SMB/CIFS Mounts</h2>
            <p v-if="mountsSummary && !loading" class="mounts-summary">
              {{ mountsSummary.total }} total, {{ mountsSummary.mounted }} mounted
            </p>
          </div>
          <div class="header-actions">
            <button @click="showAddDialog = true" class="add-button" title="Add SMB Mount">
              <Icon icon="plus" />
            </button>
            <button @click="refreshMounts" :disabled="loading" class="refresh-button" title="Refresh">
              <Icon icon="refresh" />
            </button>
          </div>
        </div>

        <div v-if="loading" class="loading-section">
          <p>Loading SMB mounts...</p>
        </div>

        <div v-else-if="error" class="error-section">
          <div class="error-content">
            <p class="error-message">{{ error }}</p>
            <button @click="refreshMounts" class="retry-button">
              Retry
            </button>
          </div>
        </div>

        <div v-else-if="mounts.length === 0" class="empty-state">
          <Icon icon="nas" class="empty-icon" />
          <h3>No SMB Mounts</h3>
          <p>No SMB/CIFS shares are currently configured for music access. Add using the + symbol</p>
        </div>

        <div v-else class="mounts-list">
          <div v-for="mount in mounts" :key="mount.id" class="card">
            <div class="mount-item" :class="{ expanded: isExpanded(mount) }">
              <div class="mount-main">
                <div class="mount-info">
                  <Icon icon="nas" class="mount-icon" />
                  <div class="mount-details">
                    <h3>
                      <span class="mount-source">{{ mount.server }}/{{ mount.share }}</span>
                      <span class="mount-separator">→</span>
                      <span class="mount-target">{{ mount.mountpoint }}</span>
                    </h3>
                  </div>
                </div>
                <div class="mount-actions">
                  <div class="mount-status">
                    <span class="status-badge" :class="{ mounted: mount.mounted, unmounted: !mount.mounted }">
                      {{ mount.mounted ? 'Mounted' : 'Unmounted' }}
                    </span>
                  </div>
                  <div class="mount-controls">
                    <button
                      @click="confirmRemoveMount(mount)"
                      :disabled="removing"
                      class="delete-button"
                      title="Remove mount"
                    >
                      <Icon icon="close" />
                    </button>
                    <div class="expand-caret" @click="toggleMountDetails(mount)">
                      <Icon icon="caret-down" class="config-caret" :class="{ expanded: isExpanded(mount) }" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Details section that expands the whole card -->
              <div class="details-section">
                <div v-if="isExpanded(mount)" class="details-content">
                  <div class="mount-info-table">
                    <table>
                      <tbody>
                        <tr>
                          <td class="label">Server</td>
                          <td class="value">{{ mount.server }}</td>
                        </tr>
                        <tr>
                          <td class="label">Share</td>
                          <td class="value">{{ mount.share }}</td>
                        </tr>
                        <tr>
                          <td class="label">Mount Point</td>
                          <td class="value">{{ mount.mountpoint }}</td>
                        </tr>
                        <tr>
                          <td class="label">User</td>
                          <td class="value">{{ mount.user || 'guest' }}</td>
                        </tr>
                        <tr>
                          <td class="label">Version</td>
                          <td class="value">{{ mount.version }}</td>
                        </tr>
                        <tr>
                          <td class="label">Options</td>
                          <td class="value">{{ mount.options }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Mount Dialog -->
    <AddSmbMountDialog
      :is-open="showAddDialog"
      @close="showAddDialog = false"
      @mount-created="handleMountCreated"
    />
  </PageContent>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Icon from '@/components/Icon.vue'
import PageContent from '@/components/PageContent.vue'
import AddSmbMountDialog from '@/components/AddSmbMountDialog.vue'
import { getSmbMounts, unmountSmbShare, type SmbMount } from '@/api/smb'
import { useAppConfigStore } from '@/stores/appconfig'
import { useToastStore } from '@/stores/toast'

// State
const loading = ref(true)
const error = ref('')
const mounts = ref<SmbMount[]>([])
const mountsSummary = ref<{ total: number; mounted: number; unmounted: number } | null>(null)
const removing = ref(false)
const rescanning = ref(false)
const expandedMounts = ref<Set<number>>(new Set())
const showAddDialog = ref(false)

// Stores
const toastStore = useToastStore()

// Methods
const toggleMountDetails = (mount: SmbMount) => {
  const key = mount.id
  if (expandedMounts.value.has(key)) {
    expandedMounts.value.delete(key)
  } else {
    expandedMounts.value.add(key)
  }
}

const isExpanded = (mount: SmbMount) => {
  const key = mount.id
  return expandedMounts.value.has(key)
}

const refreshMounts = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await getSmbMounts()

    if (response.status === 'success') {
      mounts.value = response.data.mounts
      mountsSummary.value = response.data.summary
    } else {
      error.value = response.message || 'Failed to load SMB mounts'
    }
  } catch (err) {
    console.error('Error fetching SMB mounts:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error occurred'
  } finally {
    loading.value = false
  }
}

const rescanLibrary = async () => {
  rescanning.value = true

  try {
    // Use the correct library update endpoint
    const configStore = useAppConfigStore()
    const apiBaseUrl = configStore.getApiBaseUrl()
    const url = `${apiBaseUrl}/library/mpd/update`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to start library rescan: ${response.status} ${response.statusText}`)
    }

    toastStore.showSuccessToast('Library rescan started. This may take a few minutes.')
  } catch (err) {
    console.error('Error rescanning library:', err)
    toastStore.showErrorToast('Failed to start library rescan')
  } finally {
    rescanning.value = false
  }
}

const handleMountCreated = () => {
  // Refresh mounts list after a new mount is created
  refreshMounts()
}

const confirmRemoveMount = async (mount: SmbMount) => {
  const confirmMessage = `Are you sure you want to remove the mount "${mount.server}/${mount.share}"?`

  if (confirm(confirmMessage)) {
    await removeMount(mount)
  }
}

const removeMount = async (mount: SmbMount) => {
  removing.value = true

  try {
    // Use the legacy server/share endpoint for complete removal
    const response = await unmountSmbShare(mount.server, mount.share)

    if (response.status === 'success') {
      await refreshMounts()
    } else {
      error.value = response.message || 'Failed to remove mount'
    }
  } catch (err) {
    console.error('Error removing mount:', err)
    error.value = err instanceof Error ? err.message : 'Failed to remove mount'
  } finally {
    removing.value = false
  }
}

// Lifecycle
onMounted(() => {
  refreshMounts()
})
</script>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;
@use '@/assets/scss/mixins' as *;
.breadcrumbs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;

  .rescan-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.9rem;
    transition: background-color 0.2s ease;

    &:hover:not(:disabled) {
      background: var(--primary);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    svg {
      width: 16px;
      height: 16px;
      color: #000;
    }
  }
}

.music-files-content {
  .service-info-section {
    margin-bottom: 40px;

    .info-card {
      background: var(--background-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 20px;

      .info-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;

        .info-icon {
          width: 20px;
          height: 20px;
          color: var(--primary);
        }

        h3 {
          margin: 0;
          color: var(--color-head);
          font-size: 1.1rem;
          font-weight: 600;
        }
      }

      .info-content {
        p {
          margin: 0 0 12px 0;
          color: var(--color-body);
          line-height: 1.5;

          &:last-child {
            margin-bottom: 0;
          }

          code {
            background: var(--color-bg-secondary);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Metropolis', monospace;
            font-size: 0.9em;
            color: var(--color-body);
          }
        }

        .service-url {
          margin: 12px 0;
          padding: 12px;
          background: var(--color-bg-secondary);
          border-radius: 6px;
          border-left: 3px solid var(--primary);

          code {
            background: none;
            padding: 0;
            color: var(--primary);
            font-weight: 500;
          }
        }
      }
    }
  }

  .section {
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      width: 100%;

      .header-title {
        h2 {
          margin: 0 0 4px 0;
          color: var(--color-head);
          font-size: 1.5rem;
          font-weight: 600;
        }

        .mounts-summary {
          margin: 0;
          color: var(--color-body-secondary);
          font-size: 0.9rem;
          font-weight: 400;
        }
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;

        .add-button {
          @include service-button-small;
        }

        .refresh-button {
          @include service-button-small;
        }
      }
    }

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

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 24px;
      text-align: center;
      background: var(--background-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;

      .empty-icon {
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
        color: var(--color-body-secondary);
        opacity: 0.6;
      }

      h3 {
        margin: 0 0 8px 0;
        color: var(--color-head);
        font-size: 1.25rem;
        font-weight: 600;
      }

      p {
        margin: 0 0 20px 0;
        color: var(--color-body-secondary);
        max-width: 400px;
        line-height: 1.5;
      }

      .discover-button {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        background: var(--color-primary);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: background-color 0.2s ease;

        &:hover {
          background: var(--color-primary-dark);
        }

        svg {
          width: 16px;
          height: 16px;
        }
      }
    }

    .mounts-list {
      display: grid;
      gap: 16px;

      .mount-item {
        @include service-item-base;
        // Remove the service-card-base to eliminate extra bottom margin

        // Override any extra padding from service-item-base
        & {
          padding-bottom: 20px;
        }

        &.expanded {
          @include service-expanded-state;
          // When expanded, remove bottom padding from main section
          .mount-main {
            margin-bottom: 0;
            padding-bottom: 0;
          }
        }

        .mount-main {
          @include service-main-layout;

          .mount-info {
            @include service-info-layout;

            .mount-icon {
              @include service-icon-base;
            }

            .mount-details {
              @include service-details-base;

              h3 {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;

                .mount-source {
                  color: var(--color-body);
                  font-weight: 600;
                }

                .mount-separator {
                  color: var(--color-body-secondary);
                  font-weight: 400;
                  font-size: 1.1em;
                }

                .mount-target {
                  color: var(--color-body-secondary);
                  font-weight: 400;
                  font-family: 'Metropolis', monospace;
                  background: var(--color-bg-secondary);
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-size: 0.9em;
                }
              }

              .mount-path {
                margin: 0;
                color: var(--color-body-secondary);
                font-size: 0.9rem;
                font-family: 'Metropolis', sans-serif;
              }
            }
          }

          .mount-actions {
            @include service-actions-base;
            display: flex;
            align-items: center;
            gap: 12px;

            .mount-status {
              .status-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.5px;

                &.mounted {
                  background-color: rgba(34, 197, 94, 0.1);
                  color: #22c55e;
                }

                &.unmounted {
                  background-color: rgba(156, 163, 175, 0.1);
                  color: #9ca3af;
                }
              }
            }

            .mount-controls {
              display: flex;
              align-items: center;
              gap: 8px;

              .delete-button {
                @include delete-button(24px, 14px);
              }

              .expand-caret {
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;

                .config-caret {
                  width: 16px;
                  height: 16px;
                  color: var(--color-body-secondary);
                  transition: transform 0.2s ease;

                  &.expanded {
                    transform: rotate(180deg);
                  }
                }
              }
            }
          }
        }

        .details-section {
          // Only apply section styles when expanded
          .details-content {
            @include service-content-section;
            @include service-content-box;
            // Remove default bottom padding/margin
            margin-bottom: 0;

            .mount-info-table {
              margin-bottom: 0; // Remove margin since there are no actions below

              table {
                width: 100%;
                border-collapse: collapse;

                tbody {
                  tr {
                    border-bottom: 1px solid var(--color-border);

                    &:last-child {
                      border-bottom: none;
                    }

                    td {
                      padding: 8px 0;
                      vertical-align: top;

                      &.label {
                        font-weight: 500;
                        color: var(--color-body-secondary);
                        width: 30%;
                        padding-right: 16px;
                      }

                      &.value {
                        color: var(--color-body);
                        font-family: 'Metropolis', sans-serif;
                        word-break: break-word;
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
  }
}

@media (max-width: 768px) {
  .music-files {
    .music-files-content {
      .section {
        .section-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
        }

        .mounts-list {
          .mount-item {
            .mount-main {
              .mount-info {
                .mount-details {
                  h3 {
                    font-size: 1rem;
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
