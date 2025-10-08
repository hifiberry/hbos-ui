<template>
  <ContentBox>
    <div class="webServiceContainer">
      <Icon icon="database" class="webServiceIcon" />
      <div class="webServiceDetails">
        <h3>Fanart.tv</h3>
        <p class="webServiceDescription">
          Fanart.tv is used to retrieve high-quality album covers and artist images
        </p>
        <a href="https://musicbrainz.org" target="_blank" rel="noopener noreferrer"
          class="webServiceStatusLink connected">
          Active
        </a>
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

  .webServiceIcon{
    margin-right: 15px;
    width: 40px;
    height: 40px;
    object-fit: contain;
  }

  .webServiceDescription{
    color: var(--color-body-secondary);
  }

  .webServiceStatusLink{
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;
    background-color: #e6f7e6;
    color: #2d7d2d;
  }
}
</style>
