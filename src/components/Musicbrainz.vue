<template>
  <ContentBox>
    <div class="card">
      <div class="service-item">
        <div class="service-main">
          <div class="service-info">
            <Icon icon="tabler/database" class="service-icon" />
            <div class="service-details">
              <h3>MusicBrainz</h3>
              <p class="service-description">
                MusicBrainz is used to retrieve additional artist, song and album metadata
              </p>
              <span class="status-badge green">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ContentBox>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon.vue'
import ContentBox from "@/components/ContentBox.vue"
</script>

<style scoped lang="scss">
@import '@/assets/scss/service-item';

.service-item {
  @include service-item-base;

  .service-main {
    @include service-main-layout;

    .service-info {
      @include service-info-layout;

      .service-icon {
        @include service-icon-base;
      }

      .service-details {
        @include service-details-base;
      }
    }
  }
}
</style>
