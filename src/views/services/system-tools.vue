<template>
  <div class="system-tools">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'services' }">System Tools</AppBackRouter>
    </div>

    <div class="system-tools-content">
      <div class="services-header">
        <h2>System Tools</h2>
        <p>Advanced system management tools - use with caution as they can leave the system in an unusable state</p>
      </div>

      <!-- Reset System Tool -->
      <div class="tool-section">
        <div class="tool-card">
          <div class="tool-info">
            <AppIcon icon="reset" class="tool-icon" />
            <div class="tool-details">
              <h3>Reset System</h3>
              <p class="tool-description">
                Reset the system to factory defaults. This will remove all settings, configurations, and user data.
              </p>
            </div>
          </div>
          <div class="tool-actions">
            <button @click="confirmReset" :disabled="resetting" class="reset-button">
              {{ resetting ? 'Resetting...' : 'Reset System' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/app-icon.vue'
import AppBackRouter from '@/components/app-back-router.vue'
import { useToastStore } from '@/stores/toast'

// State
const resetting = ref(false)

// Stores
const toastStore = useToastStore()

// Methods
const confirmReset = async () => {
  const confirmMessage = `Are you sure you want to reset the system to factory defaults?

This will:
- Remove all settings and configurations
- Delete all user data
- Restore the system to its original state

This action CANNOT BE UNDONE!

Type "RESET" to confirm:`

  const userInput = prompt(confirmMessage)

  if (userInput === 'RESET') {
    await resetSystem()
  } else if (userInput !== null) {
    toastStore.showErrorToast('Reset cancelled. You must type "RESET" exactly to confirm.')
  }
}

const resetSystem = async () => {
  resetting.value = true

  try {
    // TODO: Implement actual reset functionality
    // For now, just show a message that this is not implemented yet

    await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate async operation

    toastStore.showInfoToast('Reset functionality is not yet implemented. This is a placeholder for future development.')

  } catch (err) {
    console.error('Error resetting system:', err)
    toastStore.showErrorToast('Failed to reset system')
  } finally {
    resetting.value = false
  }
}
</script>

<style scoped lang="scss">
.system-tools {
  .breadcrumbs {
    margin-bottom: 32px;
  }

  .services-header {
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

  .tool-section {
    .tool-card {
      background: var(--background-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;

      .tool-info {
        display: flex;
        align-items: center;
        gap: 16px;
        flex: 1;

        .tool-icon {
          width: 32px;
          height: 32px;
          color: var(--color-error, #ef4444);
          flex-shrink: 0;
        }

        .tool-details {
          flex: 1;

          h3 {
            margin: 0 0 4px 0;
            color: var(--color-head);
            font-size: 1.1rem;
            font-weight: 600;
          }

          .tool-description {
            margin: 0;
            color: var(--color-body-secondary);
            font-size: 0.9rem;
            line-height: 1.4;
          }
        }
      }

      .tool-actions {
        flex-shrink: 0;

        .reset-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: var(--color-error, #ef4444);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.9rem;
          transition: background-color 0.2s ease;

          &:hover:not(:disabled) {
            background: var(--color-error-dark, #dc2626);
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          svg {
            width: 16px;
            height: 16px;
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .system-tools {
    .tool-section {
      .tool-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;

        .tool-actions {
          width: 100%;

          .reset-button {
            width: 100%;
            justify-content: center;
          }
        }
      }
    }
  }
}
</style>
