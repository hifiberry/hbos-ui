<template>
  <PageContent title="Bluetooth Settings" :backrouterLink="{ name: 'services' }">
      <div class="bluetooth-header">
        <p>Adjust bluetooth settings</p>
      </div>
      <ContentBox class="card-content">
        <div>
        </div>
      </ContentBox>

  </PageContent>
</template>

<script setup lang="ts">
import PageContent from '@/components/PageContent.vue'
import ContentBox from '@/components/ContentBox.vue'
</script>

<style scoped lang="scss">
.bluetooth-header {
  margin-bottom: 32px;

  h2 {
    margin: 0 0 8px 0;
    color: var(--color-head);
  }

  p {
    margin: 0;
    color: var(--color-body-secondary);
  }
}
.card-content{
  padding: 20px;
}
</style>
