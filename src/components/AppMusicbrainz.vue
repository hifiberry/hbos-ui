<template>
  <div class="musicbrainz-integration">
    <div class="card">
      <div class="service-item">
        <div class="service-main">
          <div class="service-info">
            <AppIcon icon="database" class="service-icon" />
            <div class="service-details">
              <h3>MusicBrainz</h3>
              <p class="service-description">MusicBrainz is used to retrieve additional artist, song and album metadata</p>
              <div class="service-status">
                <a href="https://musicbrainz.org" target="_blank" rel="noopener noreferrer" class="status-indicator connected">
                  Active
                </a>
              </div>
            </div>
          </div>
          <div class="service-actions">
            <!-- No actions needed for MusicBrainz as it's always active -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

// No configuration or state management needed for MusicBrainz
// It's a read-only metadata service
</script>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;

.musicbrainz-integration {
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
