<template>
  <div class="dsp-programs">
    <h1>DSP Programs</h1>

    <div class="dsp-programs-content">
      <div class="info-section">
        <div class="info-card">
          <div class="card-header">
            <AppIcon icon="download" class="card-icon" />
            <h2>Available DSP Programs</h2>
          </div>
          <p class="card-description">
            Download and manage digital signal processing programs for your HiFiBerry system.
          </p>
        </div>
      </div>

      <div class="programs-section">
        <div class="section-header">
          <h2>Program Repository</h2>
          <button class="refresh-button" @click="refreshPrograms" :disabled="loading">
            <AppIcon icon="refresh" :class="{ spinning: loading }" />
            <span>Refresh</span>
          </button>
        </div>

        <div v-if="loading" class="loading-section">
          <AppIcon icon="loading" class="loading-icon spinning" />
          <p>Loading DSP programs...</p>
        </div>

        <div v-else-if="error" class="error-section">
          <div class="error-content">
            <AppIcon icon="bell" class="error-icon" />
            <p class="error-message">{{ error }}</p>
            <button @click="refreshPrograms" class="retry-button">
              Try Again
            </button>
          </div>
        </div>

        <div v-else class="programs-grid">
          <div class="program-card coming-soon">
            <div class="program-header">
              <AppIcon icon="dsp" class="program-icon" />
              <h3>DSP Program Repository</h3>
            </div>
            <p class="program-description">
              DSP program download and management features are coming soon.
            </p>
            <div class="program-status">
              <span class="status-badge coming-soon">Coming Soon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/app-icon.vue'

// State
const loading = ref(false)
const error = ref('')

// Methods
const refreshPrograms = async () => {
  loading.value = true
  error.value = ''
  
  try {
    // Simulate API call - replace with actual implementation later
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // For now, just reset the loading state
    loading.value = false
  } catch (err) {
    console.error('Error refreshing DSP programs:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load DSP programs'
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/scss/mixins' as *;

.dsp-programs {
  h1 {
    margin-bottom: 32px;
    color: var(--color-head);
  }

  .dsp-programs-content {
    display: flex;
    flex-direction: column;
    gap: 24px;

    .info-section {
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

        .card-description {
          color: var(--color-body-secondary);
          line-height: 1.5;
          margin: 0;
        }
      }
    }

    .programs-section {
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;

        h2 {
          margin: 0;
          color: var(--color-head);
          font-size: 1.5rem;
        }

        .refresh-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 6px;
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

          .spinning {
            animation: spin 1s linear infinite;
          }
        }
      }

      .loading-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 60px 20px;
        text-align: center;
        color: var(--color-body-secondary);

        .loading-icon {
          width: 32px;
          height: 32px;
          margin-bottom: 16px;
          color: var(--color-primary);
        }
      }

      .error-section {
        display: flex;
        justify-content: center;
        padding: 40px 20px;

        .error-content {
          background: var(--background-error);
          border: 1px solid var(--color-error);
          border-radius: 8px;
          padding: 24px;
          text-align: center;
          max-width: 400px;

          .error-icon {
            width: 24px;
            height: 24px;
            color: var(--color-error);
            margin-bottom: 12px;
          }

          .error-message {
            color: var(--color-error);
            margin-bottom: 16px;
          }

          .retry-button {
            background: var(--color-error);
            color: white;
            border: none;
            padding: 10px 16px;
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

      .programs-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;

        .program-card {
          background: var(--background-card);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 24px;
          transition: all 0.2s ease;

          &.coming-soon {
            border-color: var(--color-body-secondary);
            opacity: 0.8;
          }

          .program-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;

            .program-icon {
              width: 24px;
              height: 24px;
              color: var(--color-primary);
            }

            h3 {
              margin: 0;
              color: var(--color-head);
              font-size: 1.1rem;
            }
          }

          .program-description {
            color: var(--color-body-secondary);
            line-height: 1.5;
            margin-bottom: 16px;
          }

          .program-status {
            .status-badge {
              padding: 4px 12px;
              border-radius: 4px;
              font-size: 0.875em;
              font-weight: 500;

              &.coming-soon {
                background: var(--background-warning);
                color: var(--color-warning);
              }
            }
          }
        }
      }
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spinning {
  animation: spin 1s linear infinite;
}

@media (max-width: 768px) {
  .dsp-programs {
    .dsp-programs-content {
      .programs-section {
        .section-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;

          .refresh-button {
            align-self: stretch;
            justify-content: center;
          }
        }

        .programs-grid {
          grid-template-columns: 1fr;
        }
      }
    }
  }
}
</style>
