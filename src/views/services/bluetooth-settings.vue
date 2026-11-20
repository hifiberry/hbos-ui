<template>
  <PageContent title="Bluetooth Settings" :backrouterLink="{ name: 'services' }">
      <div class="bluetooth-header">
        <p>Adjust bluetooth settings</p>
      </div>
      <BluetoothSettings @adapter-changed="devicesKey++">
      </BluetoothSettings>
      <!-- Reloaded after a change of adapter: the paired devices are its own. -->
      <BluetoothDevices :key="devicesKey">
      </BluetoothDevices>

  </PageContent>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PageContent from '@/components/PageContent.vue'
import BluetoothSettings from '@/components/BluetoothSettings.vue'
import BluetoothDevices from '@/components/BluetoothDevices.vue'

const devicesKey = ref(0)
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
