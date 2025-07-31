<template>
  <div class="dsp-backends">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'services' }">DSP Backends</AppBackRouter>
    </div>

    <div class="dsp-backends-content">
      <div class="dsp-backends-header">
        <p>Select the backend system for digital signal processing. The backend determines how filter changes are applied and managed.</p>
      </div>

      <div class="backends-list">
        <div v-for="(backend, backendId) in availableBackends" :key="backendId" class="card" :class="{ 'active-card': selectedBackend === backendId }">
          <div
            class="backend-item"
            :class="{
              'active': selectedBackend === backendId,
              'loading': switchingBackend
            }"
            @click="switchToBackend(backendId)"
            :style="{ cursor: switchingBackend || selectedBackend === backendId ? 'default' : 'pointer' }"
          >
            <div class="backend-main">
              <div class="backend-info">
                <AppIcon :icon="getBackendIcon(backendId)" class="backend-icon" />
                <div class="backend-details">
                  <h3>{{ backend.name }}</h3>
                  <p class="backend-description">{{ getBackendDescription(backendId) }}</p>
                  <div class="backend-status">
                    <span :class="['status-badge', selectedBackend === backendId ? 'active' : 'inactive']">
                      {{ selectedBackend === backendId ? 'Active' : 'Available' }}
                    </span>
                    <span v-if="switchingBackend && pendingBackend === backendId" class="switching-indicator">
                      Switching...
                    </span>
                  </div>
                  <div v-if="currentBackendCapabilities && selectedBackend === backendId" class="backend-capabilities">
                    <div class="capability-item" v-for="bankInfo in currentBackendCapabilities.availableFilterBanks" :key="bankInfo.name">
                      <span class="capability-name">{{ bankInfo.name }}</span>
                      <span class="capability-value">{{ bankInfo.currentFilterCount }}/{{ bankInfo.maxFilters }} filters</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="backend-actions">
                <!-- Info button to show detailed description -->
                <div class="backend-info-action">
                  <button
                    class="info-btn"
                    @click.stop="showBackendDetails(backendId)"
                    :title="`View ${backend.name} details`"
                  >
                    <AppIcon icon="info" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Backend Details Modal -->
    <teleport to="body">
      <div v-if="showBackendInfoModal && selectedBackendForInfo" class="modal-backdrop" @click.self="showBackendInfoModal = false">
        <div class="modal-content backend-info-modal">
          <div class="modal-header">
            <h2>{{ selectedBackendForInfo.name }} Information</h2>
            <button class="close-btn" @click="showBackendInfoModal = false">×</button>
          </div>
          <div class="modal-body" v-html="selectedBackendForInfo.description"></div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useFilterStore, type BackendCapabilities } from '@/stores/filter_connector';
import AppIcon from '@/components/app-icon.vue';
import AppBackRouter from '@/components/app-back-router.vue';

// Initialize filter store
const filterStore = useFilterStore();

// Reactive state
const selectedBackend = ref<'console' | 'dspToolkit'>('console');
const switchingBackend = ref(false);
const pendingBackend = ref<'console' | 'dspToolkit' | null>(null);
const allBackendCapabilities = ref<Record<string, BackendCapabilities>>({});
const showBackendInfoModal = ref(false);
const selectedBackendForInfo = ref<{ name: string; description: string } | null>(null);

// Available backends with enhanced info
// Available backends - names only, descriptions come from backend capabilities
const availableBackends = computed(() => ({
  console: {
    name: 'Demo'
  },
  dspToolkit: {
    name: 'DSP Toolkit'
  }
}));

// Get backend description from capabilities
const getBackendDescription = (backendId: string): string => {
  const capabilities = allBackendCapabilities.value[backendId];
  return capabilities?.backendShortDescription || '';
};

// Get current backend capabilities for display
const currentBackendCapabilities = computed(() => {
  return allBackendCapabilities.value[selectedBackend.value] || null;
});

// Helper function to get backend icon
const getBackendIcon = (backendId: 'console' | 'dspToolkit'): string => {
  switch (backendId) {
    case 'console':
      return 'balloon'; // Balloon icon for console demo backend
    case 'dspToolkit':
      return 'processor'; // DSP hardware icon using processor/CPU icon
    default:
      return 'filter-peak';
  }
};

// Load current backend and capabilities for all backends
const loadBackendInfo = async () => {
  try {
    // Get current backend type
    selectedBackend.value = filterStore.currentBackendType;

    // Load capabilities for the current backend first
    const currentCapabilities = await filterStore.getBackendCapabilities();
    allBackendCapabilities.value[selectedBackend.value] = currentCapabilities;

    // Also load capabilities for other backends by temporarily switching to them
    const backendTypes: ('console' | 'dspToolkit')[] = ['console', 'dspToolkit'];
    for (const backendType of backendTypes) {
      if (backendType !== selectedBackend.value && !allBackendCapabilities.value[backendType]) {
        try {
          await filterStore.switchBackend(backendType);
          const capabilities = await filterStore.getBackendCapabilities();
          allBackendCapabilities.value[backendType] = capabilities;
        } catch (error) {
          console.warn(`Failed to load capabilities for ${backendType}:`, error);
        }
      }
    }

    // Switch back to the original backend if we switched away
    if (filterStore.currentBackendType !== selectedBackend.value) {
      await filterStore.switchBackend(selectedBackend.value);
    }

    console.log('Backend info loaded:', {
      selectedBackend: selectedBackend.value,
      allCapabilities: allBackendCapabilities.value,
      shortDescriptions: Object.entries(allBackendCapabilities.value).map(([id, caps]) => ({
        id,
        shortDescription: caps.backendShortDescription
      }))
    });
  } catch (error) {
    console.error('Failed to load backend info:', error);
  }
};

// Switch to a different backend
const switchToBackend = async (backendId: 'console' | 'dspToolkit') => {
  // Don't switch if already switching, already selected, or if it's the same backend
  if (switchingBackend.value || selectedBackend.value === backendId) return;

  try {
    switchingBackend.value = true;
    pendingBackend.value = backendId;

    await filterStore.switchBackend(backendId);
    selectedBackend.value = backendId;

    // Update capabilities for the new backend
    const capabilities = await filterStore.getBackendCapabilities();
    allBackendCapabilities.value[backendId] = capabilities;

    console.log(`Successfully switched to backend: ${backendId}`);
  } catch (error) {
    console.error('Failed to switch backend:', error);
    alert(`Failed to switch to ${availableBackends.value[backendId].name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    switchingBackend.value = false;
    pendingBackend.value = null;
  }
};

// Show backend details modal
const showBackendDetails = async (backendId: 'console' | 'dspToolkit') => {
  try {
    // Get capabilities from our cache or load them
    let capabilities = allBackendCapabilities.value[backendId];

    if (!capabilities) {
      // If not cached, temporarily switch to get capabilities
      const originalBackend = filterStore.currentBackendType;
      await filterStore.switchBackend(backendId);
      capabilities = await filterStore.getBackendCapabilities();
      allBackendCapabilities.value[backendId] = capabilities;

      // Restore original backend if it was different
      if (originalBackend !== backendId) {
        await filterStore.switchBackend(originalBackend);
      }
    }

    selectedBackendForInfo.value = {
      name: capabilities.backendName,
      description: capabilities.backendDescription
    };
    showBackendInfoModal.value = true;

    console.log('Backend details loaded:', {
      backendId,
      name: capabilities.backendName,
      shortDescription: capabilities.backendShortDescription
    });
  } catch (error) {
    console.error('Failed to load backend details:', error);
  }
};// Initialize on mount
onMounted(() => {
  loadBackendInfo();
});
</script>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;

.dsp-backends {
  padding: 20px;

  .breadcrumbs {
    margin-bottom: 20px;
  }

  .dsp-backends-content {
    .dsp-backends-header {
      margin-bottom: 30px;

      h2 {
        margin: 0 0 10px 0;
        font-family: 'Metropolis', sans-serif;
        font-weight: 500;
        font-size: 24px;
        color: var(--color-head);
      }

      p {
        margin: 0;
        color: var(--color-body-secondary);
        line-height: 1.5;
      }
    }

    .backends-list {
      display: flex;
      flex-direction: column;
      gap: 15px;

      .card {
        @include service-card-base;
        background: var(--background-card);
        border-radius: 8px;
        border: 1px solid var(--color-border);
        overflow: hidden;
        transition: all 0.2s ease;

        &:hover {
          border-color: var(--color-border-hover);
        }

        &.active-card {
          background: rgba(225, 30, 74, 0.05);
          border-color: #e11e4a;
        }

        .backend-item {
          @include service-item-base;
          transition: all 0.2s ease;
          cursor: pointer;

          &:hover:not(.active):not(.loading) {
            background: rgba(var(--color-surface-rgb), 0.3);
            border-color: var(--color-border-hover);
          }

          &.loading {
            opacity: 0.7;
            pointer-events: none;
            cursor: default;
          }

          .backend-main {
            @include service-main-layout;

            .backend-info {
              @include service-info-layout;

              .backend-icon {
                @include service-icon-base;
              }

              .backend-details {
                @include service-details-base;

                .backend-description {
                  margin: 0 0 8px 0;
                  font-size: 14px;
                  color: var(--color-body-secondary);
                  line-height: 1.4;
                }

                .backend-status {
                  margin-bottom: 8px;
                  display: flex;
                  align-items: center;
                  gap: 12px;

                  .status-badge {
                    @include status-indicator-base;

                    &.active {
                      background: rgba(225, 30, 74, 0.2);
                      color: #e11e4a;
                    }

                    &.inactive {
                      background: rgba(112, 112, 112, 0.2);
                      color: var(--color-body-secondary);
                    }
                  }

                  .switching-indicator {
                    font-size: 14px;
                    color: var(--color-body-secondary);
                    font-style: italic;
                  }
                }

                .backend-capabilities {
                  display: flex;
                  flex-wrap: wrap;
                  gap: 12px;

                  .capability-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 10px;
                    background: rgba(225, 30, 74, 0.1);
                    border-radius: 4px;
                    font-size: 13px;

                    .capability-name {
                      font-weight: 500;
                      color: var(--color-head);
                    }

                    .capability-value {
                      color: #e11e4a;
                      font-weight: 500;
                    }
                  }
                }
              }
            }

            .backend-actions {
              @include service-actions-base;

              .backend-info-action {
                display: flex;
                align-items: center;

                .info-btn {
                  cursor: pointer;
                  padding: 4px;
                  border-radius: 4px;
                  transition: background-color 0.2s ease;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border: none;
                  background: transparent;

                  &:hover {
                    background-color: rgba(var(--color-surface-rgb), 0.5);
                  }

                  svg {
                    width: 16px;
                    height: 16px;
                    color: var(--color-text-secondary);
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

// Modal styles
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--background-card);
  border-radius: 8px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  border: 1px solid var(--color-border);

  &.backend-info-modal {
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--color-border);

      h2 {
        margin: 0;
        font-family: 'Metropolis', sans-serif;
        font-weight: 500;
        color: var(--color-head);
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        color: var(--color-body-secondary);
        cursor: pointer;
        padding: 4px;
        line-height: 1;

        &:hover {
          color: var(--color-head);
        }
      }
    }

    .modal-body {
      padding: 24px;
      color: var(--color-body);
      line-height: 1.6;

      h3 {
        color: var(--color-head);
        margin-top: 20px;
        margin-bottom: 10px;
        font-size: 16px;
      }

      ul {
        margin: 10px 0;
        padding-left: 20px;
      }

      li {
        margin-bottom: 5px;
      }

      strong {
        color: var(--color-head);
      }
    }
  }
}

@media (max-width: 768px) {
  .dsp-backends {
    padding: 15px;

    .backends-list {
      .card {
        .backend-item {
          padding: 15px;

          .backend-main {
            flex-direction: column;
            gap: 15px;

            .backend-actions {
              align-self: stretch;
              justify-content: space-between;

              .backend-select {
                flex: 1;

                .select-btn {
                  width: 100%;
                }
              }
            }
          }
        }
      }
    }
  }

  .modal-content {
    margin: 10px;
    max-height: 90vh;

    &.backend-info-modal {
      .modal-header,
      .modal-body {
        padding: 16px;
      }
    }
  }
}
</style>
