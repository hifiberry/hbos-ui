<template>
  <div class="music-files">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'services' }">Music Files</AppBackRouter>
    </div>

    <div class="music-files-content">
      <div class="section">
        <div class="section-header">
          <h2>SMB/CIFS Mounts</h2>
          <button @click="refreshMounts" :disabled="loading" class="refresh-button" title="Refresh">
            <AppIcon icon="refresh" />
          </button>
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
          <AppIcon icon="nas" class="empty-icon" />
          <h3>No SMB Mounts</h3>
          <p>No SMB/CIFS shares are currently configured for music access.</p>
          <button @click="discoverServers" class="discover-button">
            <AppIcon icon="search" />
            Discover Servers
          </button>
        </div>

        <div v-else class="mounts-list">
          <div v-for="mount in mounts" :key="mount.id" class="card">
            <div class="mount-item" :class="{ expanded: isExpanded(mount) }">
              <div class="mount-main">
                <div class="mount-info">
                  <AppIcon icon="nas" class="mount-icon" />
                  <div class="mount-details">
                    <h3>{{ mount.server }}/{{ mount.share }}</h3>
                    <p class="mount-path">mounted on {{ mount.mountpoint }}</p>
                  </div>
                </div>
                <div class="mount-actions">
                  <div class="mount-toggle">
                    <label class="toggle-switch">
                      <input
                        type="checkbox"
                        :checked="mount.mounted"
                        :disabled="mounting || unmounting"
                        @click="handleToggleMount($event, mount)"
                      >
                      <span class="toggle-slider" :class="{ loading: mounting || unmounting }"></span>
                    </label>
                  </div>
                  <div class="mount-expand">
                    <div class="expand-caret" @click="toggleMountDetails(mount)">
                      <AppIcon icon="caret-down" class="config-caret" :class="{ expanded: isExpanded(mount) }" />
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
                  <div class="details-actions">
                    <button
                      @click="removeMount(mount)"
                      :disabled="removing"
                      class="action-btn action-btn--remove"
                    >
                      <AppIcon icon="delete" />
                      Remove Mount
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppIcon from '@/components/app-icon.vue'
import AppBackRouter from '@/components/app-back-router.vue'
import { getSmbMounts, unmountSmbShare, mountSmbShareById, unmountSmbShareById, type SmbMount } from '@/api/smb'

// State
const loading = ref(true)
const error = ref('')
const mounts = ref<SmbMount[]>([])
const mounting = ref(false)
const unmounting = ref(false)
const removing = ref(false)
const expandedMounts = ref<Set<number>>(new Set())

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

const discoverServers = async () => {
  // TODO: Implement server discovery functionality
  console.log('Discovering SMB servers...')
}

const handleToggleMount = async (event: Event, mount: SmbMount) => {
  // Prevent the default checkbox behavior
  event.preventDefault()

  if (mounting.value || unmounting.value) return

  const wasEnabled = mount.mounted

  try {
    if (wasEnabled) {
      // Unmount the share using ID
      unmounting.value = true
      const response = await unmountSmbShareById(mount.id)

      if (response.status === 'success') {
        await refreshMounts()
      } else {
        error.value = response.message || 'Failed to unmount share'
      }
    } else {
      // Mount the share using ID
      mounting.value = true
      const response = await mountSmbShareById(mount.id)

      if (response.status === 'success') {
        await refreshMounts()
      } else {
        error.value = response.message || 'Failed to mount share'
      }
    }
  } catch (err) {
    console.error('Error toggling mount:', err)
    error.value = err instanceof Error ? err.message : 'Failed to toggle mount'
  } finally {
    mounting.value = false
    unmounting.value = false
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

.music-files {
  .music-files-content {
    .section {
      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 24px;
        width: 100%;

        h2 {
          margin: 0;
          color: var(--color-head);
          font-size: 1.5rem;
          font-weight: 600;
        }

        .refresh-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          width: 32px;
          height: 32px;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s ease;

          &:hover:not(:disabled) {
            background: var(--color-primary-dark);
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          svg {
            width: 100%;
            height: 100%;
            flex-shrink: 0;
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

              .mount-toggle {
                position: relative;
                display: inline-block;
                width: 44px;
                height: 24px;
                cursor: pointer;

                input {
                  opacity: 0;
                  width: 0;
                  height: 0;
                }

                .toggle-slider {
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background-color: var(--color-body-secondary);
                  transition: 0.3s;
                  border-radius: 24px;

                  &.loading {
                    opacity: 0.6;
                  }

                  &:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.3s;
                    border-radius: 50%;
                  }
                }

                input:checked + .toggle-slider {
                  background-color: var(--primary);
                }

                input:checked + .toggle-slider:before {
                  transform: translateX(20px);
                }

                input:focus + .toggle-slider {
                  box-shadow: 0 0 1px var(--primary);
                }
              }

              .mount-expand {
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

          .details-section {
            // Only apply section styles when expanded
            .details-content {
              @include service-content-section;
              @include service-content-box;
              // Remove default bottom padding/margin
              margin-bottom: 0;

              .mount-info-table {
                margin-bottom: 16px;

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

              .details-actions {
                display: flex;
                gap: 8px;
                margin-bottom: 0; // Remove any bottom margin

                .action-btn {
                  @include service-button-base;
                  display: flex;
                  align-items: center;
                  gap: 6px;

                  &--remove {
                    @include service-button-danger;
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

            .details-section {
              .details-content {
                .details-actions {
                  flex-wrap: wrap;
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
