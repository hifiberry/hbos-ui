<template>
  <PageContent title="Bluetooth Settings" :backrouterLink="{ name: 'services' }">
      <div class="bluetooth-header">
        <p>Adjust bluetooth settings</p>
      </div>
      <BluetoothSettings>
      </BluetoothSettings>
      <BluetoothDevices>
      </BluetoothDevices>

  </PageContent>
</template>

<script setup lang="ts">
import PageContent from '@/components/PageContent.vue'
import ContentBox from '@/components/ContentBox.vue'
import BluetoothSettings from '@/components/BluetoothSettings.vue'
import BluetoothDevices from '@/components/BluetoothDevices.vue'
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
</style>
