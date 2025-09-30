<template>
  <div class="theaudiodb-integration">
    <div class="card">
      <div class="service-item">
        <div class="service-main">
          <div class="service-info">
            <AppIcon icon="database" class="service-icon" />
            <div class="service-details">
              <h3>TheAudioDB</h3>
              <p class="service-description">TheAudioDB is used to retrieve additional artist images and biographies</p>
              <div class="service-status">
                <a href="https://www.theaudiodb.com" target="_blank" rel="noopener noreferrer" class="status-indicator connected">
                  Active
                </a>
              </div>
            </div>
          </div>
          <div class="service-actions">
            <!-- No actions needed for TheAudioDB as it's always active -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

// No configuration or state management needed for TheAudioDB
// It's a read-only metadata service
</script>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;

.theaudiodb-integration {
  .card {
    @include service-card-base;
  }

  .service-item {
    @include service-item-base;

    .service-main {
      @include service-main-layout;
    }

    .service-info {
      @include service-info-layout;

      .service-icon {
        @include service-icon-base;
      }

      .service-details {
        @include service-details-base;
      }
    }

    .service-actions {
      @include service-actions-base;
    }
  }

  .status-indicator {
    @include status-indicator-base;
  }
}
</style>
