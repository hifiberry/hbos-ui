<template>
  <teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal-content backend-info-modal">
        <div class="modal-header">
          <h2>{{ capabilities?.backendName || 'Backend' }} Information</h2>
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>
        <div class="modal-body" v-html="capabilities?.backendDescription"></div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { type BackendCapabilities } from '@/stores/filter_connector';

defineProps<{
  open: boolean
  capabilities: BackendCapabilities | null
}>();

defineEmits<{
  close: []
}>();
</script>
