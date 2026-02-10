<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>{{ title }}</h2>
        <button @click="$emit('close')" class="close-button" title="Close">
          <Icon icon="close" />
        </button>
      </div>

      <div class="modal-body">
        <slot />
      </div>

      <div class="modal-footer">
        <div class="step-navigation">
          <button v-if="currentStep > 1" @click="$emit('previous')" class="nav-button secondary">
            <Icon icon="arrow-left" />
            Previous
          </button>
          <div class="step-indicator">Step {{ currentStep }} of {{ totalSteps }}</div>
          <button
            v-if="currentStep < totalSteps"
            @click="$emit('next')"
            :disabled="!canProceedNext"
            class="nav-button primary"
          >
            {{ nextLabel || 'Next' }}
            <Icon icon="arrow-right" />
          </button>
          <button
            v-else
            @click="$emit('finish')"
            :disabled="savingFinal"
            class="nav-button primary"
          >
            <Icon v-if="savingFinal" icon="spinner" class="spinning" />
            <Icon v-else :icon="finalIcon || 'checkmark'" />
            {{ finalLabel || 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon.vue'

interface Props {
  isOpen: boolean
  title: string
  currentStep: number
  totalSteps: number
  canProceedNext?: boolean
  nextLabel?: string
  finalLabel?: string
  finalIcon?: string
  savingFinal?: boolean
}

withDefaults(defineProps<Props>(), {
  canProceedNext: true,
  savingFinal: false,
})

defineEmits<{
  close: []
  next: []
  previous: []
  finish: []
}>()
</script>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--background-card);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 700px;
  width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px 20px 32px;
  border-bottom: 1px solid var(--color-border);

  h2 {
    margin: 0;
    color: var(--color-head);
    font-size: 1.5rem;
    font-weight: 600;
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    color: var(--color-body-secondary);
    transition: all 0.2s ease;

    &:hover {
      background: var(--color-bg-secondary);
      color: var(--color-head);
    }

    svg {
      width: 18px;
      height: 18px;
    }
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}

.modal-footer {
  border-top: 1px solid var(--color-border);
  padding: 20px 32px;

  .step-navigation {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .step-indicator {
      font-size: 0.875rem;
      color: var(--color-body-secondary);
      font-weight: 500;
    }
  }
}

.nav-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  font-size: 0.875rem;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.secondary {
    background: var(--color-bg-secondary);
    color: var(--color-body);
    border: 1px solid var(--color-border);

    &:hover:not(:disabled) {
      background: var(--color-border);
    }
  }

  &.primary {
    background: var(--primary);
    color: white;

    &:hover:not(:disabled) {
      background: var(--primary-dark, var(--primary));
      opacity: 0.9;
    }
  }

  svg {
    width: 16px;
    height: 16px;
  }
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .modal-content {
    width: 95vw;
    max-height: 90vh;
  }

  .modal-header {
    padding: 20px 24px 16px 24px;

    h2 {
      font-size: 1.25rem;
    }
  }

  .modal-body {
    padding: 24px;
  }

  .modal-footer {
    padding: 16px 24px;

    .step-navigation {
      .step-indicator {
        font-size: 0.8125rem;
      }
    }
  }
}
</style>
