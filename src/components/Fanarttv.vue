<template>
  <div class="fanarttv-integration">
    <div class="card">
      <div class="service-item">
        <div class="service-main">
          <div class="service-info">
            <Icon icon="database" class="service-icon" />
            <div class="service-details">
              <h3>Fanart.tv</h3>
              <p class="service-description">Fanart.tv is used to retrieve high-quality album covers and artist images</p>
              <div class="service-status">
                <a href="https://fanart.tv" target="_blank" rel="noopener noreferrer" class="status-indicator connected">
                  Active
                </a>
              </div>
            </div>
          </div>
          <div class="service-actions">
            <!-- No actions needed for Fanart.tv as it's always active -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon.vue'

// No configuration or state management needed for Fanart.tv
// It's a read-only metadata service
</script>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;

.fanarttv-integration {
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
