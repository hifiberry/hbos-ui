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

<style scoped lang="scss">
@use '@/assets/scss/popup' as *;

.modal-backdrop {
  @include popup-overlay;
}

.modal-content {
  @include popup-container(600px);
}

.modal-header {
  @include popup-header;

  .close-btn {
    @include popup-close-button;
    font-size: 24px;
    line-height: 1;
  }
}

.modal-body {
  @include popup-content;
  color: var(--color-body, #666);
  line-height: 1.6;

  :deep(a) {
    color: var(--primary, #e11e4a);
  }

  :deep(p) {
    margin: 0 0 12px;
  }
}
</style>
