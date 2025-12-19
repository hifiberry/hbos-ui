<template>
  <ContentBox>
    <div class="webServiceContainer">
      <Icon icon="database" class="service-icon" />
    <div class="webServiceDetails">
        <h3>MusicBrainz</h3>
        <p class="webServiceDescription">
          MusicBrainz is used to retrieve additional artist, song and album metadata
        </p>
        <span class="status-badge green">
          Active
        </span>
      </div>
    </div>
  </ContentBox>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon.vue'
import ContentBox from "@/components/ContentBox.vue"

// No configuration or state management needed for MusicBrainz
// It's a read-only metadata service
</script>

<style scoped lang="scss">
.webServiceContainer{
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  padding: 44px;
  @media (max-width: 768px) {
    padding: 20px;
  }

  .service-icon{
    margin-right: 15px;
    width: 40px;
    height: 40px;
    color: var(--color-icon-primary);
    object-fit: contain;
  }

  .webServiceDescription{
    color: var(--color-body-secondary);
  }
}
</style>
