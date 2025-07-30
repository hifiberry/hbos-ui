<template>
  <div v-if="isOpen" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>{{ title }}</h2>
        <button @click="closeDialog" class="close-button" title="Close">
          <AppIcon icon="close" />
        </button>
      </div>

      <div class="modal-body">
        <div class="confirmation-content">
          <div v-if="icon" class="confirmation-icon">
            <AppIcon :icon="icon" class="dialog-icon" />
          </div>
          <div class="confirmation-text">
            <p v-for="line in messageLines" :key="line" class="message-line">
              {{ line }}
            </p>
          </div>
          <div v-if="requiresTextConfirmation" class="text-confirmation">
            <label for="confirmation-input" class="confirmation-label">
              Type "{{ confirmationText }}" to confirm:
            </label>
            <input
              id="confirmation-input"
              v-model="userInput"
              type="text"
              class="confirmation-input"
              :placeholder="confirmationText"
              @keyup.enter="handleConfirm"
            />
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="closeDialog" class="cancel-button">
          Cancel
        </button>
        <button
          @click="handleConfirm"
          :disabled="(requiresTextConfirmation && userInput !== confirmationText) || disabled"
          class="confirm-button"
          :class="{ danger: isDangerous }"
        >
          {{ confirmButtonText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/app-icon.vue'

interface Props {
  isOpen: boolean
  title: string
  message: string
  confirmButtonText?: string
  cancelButtonText?: string
  isDangerous?: boolean
  icon?: string
  requiresTextConfirmation?: boolean
  confirmationText?: string
  disabled?: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'confirm'): void
}

const props = withDefaults(defineProps<Props>(), {
  confirmButtonText: 'Confirm',
  cancelButtonText: 'Cancel',
  isDangerous: false,
  requiresTextConfirmation: false,
  confirmationText: 'CONFIRM',
  disabled: false
})

const emit = defineEmits<Emits>()

const userInput = ref('')

const messageLines = computed(() => {
  return props.message.split('\n').filter(line => line.trim() !== '')
})

const closeDialog = () => {
  userInput.value = ''
  emit('close')
}

const handleConfirm = () => {
  if (props.requiresTextConfirmation && userInput.value !== props.confirmationText) {
    return
  }

  userInput.value = ''
  emit('confirm')
}

const handleOverlayClick = () => {
  closeDialog()
}

// Reset user input when dialog opens/closes
watch(() => props.isOpen, (newValue) => {
  if (!newValue) {
    userInput.value = ''
  }
})
</script>

<style scoped lang="scss">
.modal-overlay {
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
  padding: 20px;
}

.modal-content {
  background: var(--background-card);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 0 24px;

  h2 {
    margin: 0;
    color: var(--color-head);
    font-size: 1.5rem;
    font-weight: 600;
  }

  .close-button {
    background: none;
    border: none;
    padding: 8px;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-body-secondary);
    transition: all 0.2s ease;

    &:hover {
      background: var(--color-border);
      color: var(--color-head);
    }

    svg {
      width: 20px;
      height: 20px;
    }
  }
}

.modal-body {
  padding: 24px;
}

.confirmation-content {
  .confirmation-icon {
    text-align: center;
    margin-bottom: 16px;

    .dialog-icon {
      width: 48px;
      height: 48px;
      color: var(--color-warning, #f59e0b);
    }
  }

  .confirmation-text {
    margin-bottom: 20px;

    .message-line {
      margin: 0 0 8px 0;
      color: var(--color-body);
      line-height: 1.5;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  .text-confirmation {
    margin-top: 20px;

    .confirmation-label {
      display: block;
      margin-bottom: 8px;
      color: var(--color-head);
      font-weight: 500;
    }

    .confirmation-input {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: var(--background-input);
      color: var(--color-body);
      font-size: 1rem;

      &:focus {
        outline: none;
        border-color: var(--color-primary);
      }
    }
  }
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 0 24px 24px 24px;
  justify-content: flex-end;

  button {
    @include button-base;
    @include button-md;
  }

  .cancel-button {
    @include button-secondary;
  }

  .confirm-button {
    @include button-primary;

    &.danger {
      @include button-danger;
    }
  }
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: 10px;
  }

  .modal-content {
    max-width: 100%;
  }

  .modal-header {
    padding: 20px 20px 0 20px;

    h2 {
      font-size: 1.25rem;
    }
  }

  .modal-body {
    padding: 20px;
  }

  .modal-footer {
    padding: 0 20px 20px 20px;
    flex-direction: column;

    button {
      width: 100%;
    }
  }
}
</style>
