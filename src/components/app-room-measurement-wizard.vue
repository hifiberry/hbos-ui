<template>
  <div v-if="isOpen" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Room Measurement Wizard</h2>
        <button @click="closeWizard" class="close-button" title="Close">
          <AppIcon icon="close" />
        </button>
      </div>

      <div class="modal-body">
        <!-- Step 1: Microphone Detection -->
        <div v-if="currentStep === 1" class="step-content">
          <div class="step-header">
            <AppIcon icon="tabler/microphone" class="step-icon" />
            <div class="step-info">
              <h3>Step 1: Microphone Detection</h3>
              <p>Detecting available microphones for room measurement...</p>
            </div>
          </div>

          <div class="measurement-mic-image">
            <img src="/images/measurement-mic.png" alt="Measurement Microphone" />
          </div>

          <div v-if="loadingMicrophones" class="loading-section">
            <div class="spinner"></div>
            <p>Searching for microphones...</p>
          </div>

          <div v-else-if="microphoneError" class="error-section">
            <AppIcon icon="tabler/alert-circle" class="error-icon" />
            <p class="error-message">{{ microphoneError }}</p>
            <button @click="detectMicrophones" class="retry-button">
              <AppIcon icon="refresh" />
              Retry Detection
            </button>
          </div>

          <div v-else-if="detectedMicrophones.length === 0" class="empty-section">
            <AppIcon icon="tabler/microphone-off" class="empty-icon" />
            <h4>No Microphones Detected</h4>
            <p>Please connect a USB microphone or ensure your microphone is properly configured.</p>
            <button @click="detectMicrophones" class="retry-button">
              <AppIcon icon="refresh" />
              Check Again
            </button>
          </div>

          <div v-else class="microphones-section">
            <h4>Found {{ detectedMicrophones.length }} microphone{{ detectedMicrophones.length !== 1 ? 's' : '' }}:</h4>
            <div class="microphones-list">
              <div
                v-for="microphone in detectedMicrophones"
                :key="microphone.card_index"
                class="microphone-item"
                :class="{ selected: selectedMicrophone?.card_index === microphone.card_index }"
                @click="selectMicrophone(microphone)"
              >
                <div class="microphone-info">
                  <AppIcon icon="tabler/microphone" class="microphone-icon" />
                  <div class="microphone-details">
                    <h5>{{ microphone.device_name }}</h5>
                    <p class="microphone-specs">
                      <span class="spec-item">Card: {{ microphone.card_index }}</span>
                      <span class="spec-item">Sensitivity: {{ microphone.sensitivity_str }} dB</span>
                      <span class="spec-item">Gain: {{ microphone.gain_db }} dB</span>
                    </p>
                  </div>
                </div>
                <div class="microphone-select">
                  <AppIcon v-if="selectedMicrophone?.card_index === microphone.card_index" icon="checkmark" class="check-icon" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Microphone Positioning -->
        <div v-if="currentStep === 2" class="step-content">
          <div class="step-header">
            <AppIcon icon="tabler/target" class="step-icon" />
            <div class="step-info">
              <h3>Step 2: Microphone Positioning</h3>
              <p>Position your measurement microphone at your listening position pointing upwards.</p>
            </div>
          </div>

          <div class="measurement-mic-image">
            <img src="/images/measurement-mic-upright.png" alt="Microphone Positioning - Upright at Listening Position" />
          </div>

          <div class="positioning-instructions">
            <p>
              Place the microphone at your listening position with the capsule pointing upward.
              Ensure it's stable and positioned exactly where your head would be when listening to music.
            </p>
          </div>
        </div>

        <!-- Future steps will be added here -->
      </div>

      <div class="modal-footer">
        <div class="step-navigation">
          <button v-if="currentStep > 1" @click="previousStep" class="nav-button secondary">
            <AppIcon icon="arrow-left" />
            Previous
          </button>
          <div class="step-indicator">
            Step {{ currentStep }} of {{ totalSteps }}
          </div>
          <button
            v-if="canProceedToNextStep"
            @click="nextStep"
            class="nav-button primary"
            :disabled="!canProceedToNextStep"
          >
            Next
            <AppIcon icon="arrow-right" />
          </button>
          <button v-else-if="currentStep === totalSteps" @click="completeMeasurement" class="nav-button primary">
            Complete
            <AppIcon icon="checkmark" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import AppIcon from '@/components/app-icon.vue'
import { getRoomEQMicrophones, type RoomEQMicrophone } from '@/api/roomeq'

// Props
interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  close: []
  measurementCompleted: []
}>()

// State
const currentStep = ref(1)
const totalSteps = ref(2) // Step 1: Microphone Detection, Step 2: Microphone Positioning
const loadingMicrophones = ref(false)
const microphoneError = ref('')
const detectedMicrophones = ref<RoomEQMicrophone[]>([])
const selectedMicrophone = ref<RoomEQMicrophone | null>(null)

// Computed
const canProceedToNextStep = computed(() => {
  if (currentStep.value === 1) {
    return selectedMicrophone.value !== null
  }
  if (currentStep.value === 2) {
    return true // User can proceed after reading positioning instructions
  }
  return true
})

// Methods
const handleOverlayClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    closeWizard()
  }
}

const closeWizard = () => {
  emit('close')
  resetWizard()
}

const resetWizard = () => {
  currentStep.value = 1
  loadingMicrophones.value = false
  microphoneError.value = ''
  detectedMicrophones.value = []
  selectedMicrophone.value = null
}

const detectMicrophones = async () => {
  loadingMicrophones.value = true
  microphoneError.value = ''
  detectedMicrophones.value = []
  selectedMicrophone.value = null

  try {
    console.log('Detecting microphones...')
    const response = await getRoomEQMicrophones()

    if (response.success && response.data) {
      detectedMicrophones.value = response.data
      console.log(`Found ${response.data.length} microphones:`, response.data)

      // Auto-select the first microphone if only one is found
      if (response.data.length === 1) {
        selectedMicrophone.value = response.data[0]
      }
    } else {
      microphoneError.value = response.detail || 'Failed to detect microphones'
    }
  } catch (error) {
    console.error('Error detecting microphones:', error)
    microphoneError.value = error instanceof Error ? error.message : 'Unknown error occurred'
  } finally {
    loadingMicrophones.value = false
  }
}

const selectMicrophone = (microphone: RoomEQMicrophone) => {
  selectedMicrophone.value = microphone
  console.log('Selected microphone:', microphone)
}

const nextStep = () => {
  if (canProceedToNextStep.value && currentStep.value < totalSteps.value) {
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const completeMeasurement = () => {
  console.log('Completing measurement with microphone:', selectedMicrophone.value)
  emit('measurementCompleted')
}

// Lifecycle
onMounted(() => {
  if (props.isOpen) {
    detectMicrophones()
  }
})

// Watch for prop changes to auto-detect when wizard opens
watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    detectMicrophones()
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

.step-content {
  .step-header {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 24px;

    .step-icon {
      width: 48px;
      height: 48px;
      color: var(--primary);
      flex-shrink: 0;
      margin-top: 4px;
    }

    .step-info {
      flex: 1;

      h3 {
        margin: 0 0 8px 0;
        color: var(--color-head);
        font-size: 1.375rem;
        font-weight: 600;
      }

      p {
        margin: 0;
        color: var(--color-body-secondary);
        font-size: 1rem;
        line-height: 1.5;
      }
    }
  }

  .measurement-mic-image {
    width: 100%;
    height: 200px;
    border-radius: 12px;
    overflow: hidden;
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 32px;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center;
    }
  }

  .loading-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px;
    text-align: center;

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-border);
      border-top: 3px solid var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    p {
      margin: 0;
      color: var(--color-body-secondary);
    }
  }

  .error-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px;
    text-align: center;

    .error-icon {
      width: 48px;
      height: 48px;
      color: var(--color-error, #dc3545);
      margin-bottom: 16px;
    }

    .error-message {
      margin: 0 0 24px 0;
      color: var(--color-error, #dc3545);
      font-weight: 500;
    }

    .retry-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s ease;

      &:hover {
        background: var(--primary-dark, var(--primary));
        opacity: 0.9;
      }

      svg {
        width: 16px;
        height: 16px;
      }
    }
  }

  .empty-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px;
    text-align: center;

    .empty-icon {
      width: 64px;
      height: 64px;
      color: var(--color-body-secondary);
      opacity: 0.6;
      margin-bottom: 24px;
    }

    h4 {
      margin: 0 0 16px 0;
      color: var(--color-head);
      font-size: 1.25rem;
      font-weight: 600;
    }

    p {
      margin: 0 0 24px 0;
      color: var(--color-body-secondary);
      line-height: 1.5;
      max-width: 400px;
    }

    .retry-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s ease;

      &:hover {
        background: var(--primary-dark, var(--primary));
        opacity: 0.9;
      }

      svg {
        width: 16px;
        height: 16px;
      }
    }
  }

  .microphones-section {
    h4 {
      margin: 0 0 20px 0;
      color: var(--color-head);
      font-size: 1.125rem;
      font-weight: 600;
    }

    .microphones-list {
      display: grid;
      gap: 12px;
      margin-bottom: 32px;

      .microphone-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: var(--background-card);
        border: 2px solid var(--color-border);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          border-color: var(--primary);
          background: var(--color-bg-secondary);
        }

        &.selected {
          border-color: var(--primary);
          background: rgba(var(--primary-rgb, 225, 30, 74), 0.05);
        }

        .microphone-info {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;

          .microphone-icon {
            width: 32px;
            height: 32px;
            color: var(--primary);
            flex-shrink: 0;
          }

          .microphone-details {
            flex: 1;

            h5 {
              margin: 0 0 6px 0;
              color: var(--color-head);
              font-size: 1rem;
              font-weight: 600;
            }

            .microphone-specs {
              margin: 0;
              font-size: 0.875rem;
              color: var(--color-body-secondary);
              display: flex;
              flex-wrap: wrap;
              gap: 16px;

              .spec-item {
                white-space: nowrap;
              }
            }
          }
        }

        .microphone-select {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;

          .check-icon {
            width: 20px;
            height: 20px;
            color: var(--primary);
          }
        }
      }
    }

    .selected-microphone-info {
      h5 {
        margin: 0 0 16px 0;
        color: var(--color-head);
        font-size: 1rem;
        font-weight: 600;
      }

      .microphone-details-card {
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 20px;

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--color-border);

          &:last-child {
            border-bottom: none;
          }

          .detail-label {
            font-weight: 500;
            color: var(--color-body-secondary);
          }

          .detail-value {
            font-weight: 500;
            color: var(--color-head);
            font-family: 'Metropolis', monospace;
          }
        }
      }
    }

    .positioning-instructions {
      p {
        margin: 0;
        color: var(--color-body);
        font-size: 1rem;
        line-height: 1.6;
        text-align: center;
        padding: 24px 32px;
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: 8px;
      }
    }
  }
}

.modal-footer {
  border-top: 1px solid var(--color-border);
  padding: 20px 32px;

  .step-navigation {
    display: flex;
    align-items: center;
    justify-content: space-between;

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

    .step-indicator {
      font-size: 0.875rem;
      color: var(--color-body-secondary);
      font-weight: 500;
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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
      .nav-button {
        padding: 8px 16px;
        font-size: 0.875rem;
      }
    }
  }

  .step-content {
    .measurement-mic-image {
      height: 150px;
    }

    .positioning-instructions {
      p {
        padding: 20px 24px;
        font-size: 0.875rem;
      }
    }

    .microphones-section {
      .microphones-list {
        .microphone-item {
          .microphone-info {
            .microphone-details {
              .microphone-specs {
                flex-direction: column;
                gap: 4px;
                align-items: flex-start;
              }
            }
          }
        }
      }
    }
  }
}
</style>
