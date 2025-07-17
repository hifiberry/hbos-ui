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
          <h2>Raspberry Pi</h2>
          <table class="info-table">
            <tbody>
              <tr>
                <td class="label">Model</td>
                <td class="value">{{ systemInfo.pi_model.name }}</td>
              </tr>
              <tr>
                <td class="label">Version</td>
                <td class="value">{{ systemInfo.pi_model.version }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- HAT Information -->
        <div class="info-card">
          <h2>HAT Information</h2>
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
                <td class="label">Vendor Card</td>
                <td class="value">{{ systemInfo.hat_info.vendor_card }}</td>
              </tr>
              <tr>
                <td class="label">UUID</td>
                <td class="value uuid">{{ systemInfo.hat_info.uuid }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- System Information -->
        <div class="info-card">
          <h2>System</h2>
          <table class="info-table">
            <tbody>
              <tr>
                <td class="label">System UUID</td>
                <td class="value uuid">{{ systemInfo.system.uuid }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSystemInfo, type SystemInfo } from '@/api/system'

// State
const loading = ref(true)
const error = ref('')
const systemInfo = ref<SystemInfo | null>(null)

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
})
</script>

<style scoped lang="scss">
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

        h2 {
          margin: 0 0 16px 0;
          color: var(--color-head);
          font-size: 1.25rem;
          font-weight: 600;
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
                  font-family: var(--font-family-mono, 'Courier New', monospace);

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

@media (max-width: 768px) {
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
