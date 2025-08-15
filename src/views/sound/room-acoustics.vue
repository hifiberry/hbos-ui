<template>
  <div class="room-acoustics-page">
    <div class="room-acoustics">
      <div class="page-header">
        <h1>Room Acoustics Correction</h1>
        <button @click="startMeasurement" class="measure-button" title="Start Room Measurement">
          <AppIcon icon="tabler/microphone" />
          Measure Room
        </button>
      </div>

      <div class="card">
        <div class="empty-state">
          <AppIcon icon="tabler/armchair" class="empty-icon" />
          <h3>Room Acoustics Correction</h3>
          <p>Use the "Measure Room" button above to start the acoustic measurement wizard. This will help you analyze and correct room acoustics for optimal sound reproduction.</p>
        </div>
      </div>
    </div>

    <!-- Room Measurement Wizard -->
    <AppRoomMeasurementWizard
      :is-open="showMeasurementWizard"
      @close="showMeasurementWizard = false"
      @measurement-completed="handleMeasurementCompleted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/app-icon.vue'
import AppRoomMeasurementWizard from '@/components/app-room-measurement-wizard.vue'

// State
const showMeasurementWizard = ref(false)

// Methods
const startMeasurement = () => {
  showMeasurementWizard.value = true
}

const handleMeasurementCompleted = () => {
  // Handle measurement completion
  console.log('Room measurement completed')
  showMeasurementWizard.value = false
}
</script>

<style scoped lang="scss">
.room-acoustics-page {
  width: 100%;
  height: 100%;
}

.room-acoustics {
  padding: 20px;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h1 {
      margin: 0;
      font-family: 'Metropolis', sans-serif;
      font-weight: 500;
      font-size: 28px;
    }

    .measure-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      font-size: 1rem;
      transition: background-color 0.2s ease;

      &:hover {
        background: var(--primary-dark, var(--primary));
        opacity: 0.9;
      }

      svg {
        width: 18px;
        height: 18px;
      }
    }
  }

  .card {
    padding: 40px;
    margin-bottom: 20px;
    border-radius: 8px;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
  }

  .empty-state {
    text-align: center;
    max-width: 400px;

    .empty-icon {
      width: 64px;
      height: 64px;
      margin-bottom: 20px;
      fill: #707070;
    }

    h3 {
      font-size: 24px;
      font-weight: 500;
      margin-bottom: 15px;
      color: #333;
    }

    p {
      font-size: 16px;
      color: #666;
      line-height: 1.6;
    }
  }
}

@media (max-width: 768px) {
  .room-acoustics {
    padding: 10px;

    .card {
      padding: 20px;
      min-height: 300px;
    }

    .empty-state {
      .empty-icon {
        width: 48px;
        height: 48px;
      }

      h3 {
        font-size: 20px;
      }

      p {
        font-size: 14px;
      }
    }
  }
}
</style>
