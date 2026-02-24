<template>
  <teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal-content room-eq-modal">
        <div class="modal-header">
          <h2>Load Room EQ Configuration</h2>
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>
        <div class="modal-body">
          <div v-if="loading" class="loading-message">
            Loading configurations...
          </div>
          <div v-else-if="configs.length === 0" class="no-configs-message">
            No Room EQ configurations found. Create one using the Room Equalisation Wizard first.
          </div>
          <div v-else>
            <div class="config-selection">
              <h4>Select Configuration:</h4>
              <div class="config-list">
                <div
                  v-for="config in configs"
                  :key="config.key"
                  :class="['config-item', { selected: selectedConfig === config }]"
                  @click="selectedConfig = config"
                >
                  <div class="config-name">{{ config.data.name }}</div>
                  <div class="config-details">
                    {{ config.data.filters.length }} filters •
                    {{ new Date(config.data.created_at).toLocaleDateString() }}
                  </div>
                </div>
              </div>
            </div>

            <div v-if="selectedConfig" class="channel-selection">
              <h4>Apply to Channels:</h4>
              <div class="channel-options">
                <label class="channel-option">
                  <input type="radio" v-model="channelMode" value="left" />
                  <span>Left Channel Only</span>
                </label>
                <label class="channel-option">
                  <input type="radio" v-model="channelMode" value="right" />
                  <span>Right Channel Only</span>
                </label>
                <label class="channel-option">
                  <input type="radio" v-model="channelMode" value="both" />
                  <span>Both Channels</span>
                </label>
              </div>
            </div>

            <div class="modal-actions">
              <button @click="$emit('close')" class="btn secondary">Cancel</button>
              <button
                @click="$emit('load', selectedConfig!, channelMode)"
                :disabled="!selectedConfig"
                class="btn primary"
              >
                Load Configuration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';

export interface RoomEQConfig {
  name: string;
  filters: Array<{
    filter_type: string;
    frequency: number;
    gain_db: number;
    q: number;
    description?: string;
  }>;
  created_at: string;
}

export interface RoomEQConfigItem {
  key: string;
  data: RoomEQConfig;
}

const props = defineProps<{
  open: boolean
  loading: boolean
  configs: RoomEQConfigItem[]
}>();

defineEmits<{
  close: []
  load: [config: RoomEQConfigItem, channelMode: 'left' | 'right' | 'both']
}>();

const selectedConfig = ref<RoomEQConfigItem | null>(null);
const channelMode = ref<'left' | 'right' | 'both'>('both');
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
}

.loading-message,
.no-configs-message {
  text-align: center;
  padding: 30px 0;
  color: var(--color-body-secondary, #666);
}

.config-selection {
  h4 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-head);
  }
}

.config-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 250px;
  overflow-y: auto;
}

.config-item {
  padding: 12px 16px;
  border: 1px solid rgba(112, 112, 112, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(225, 30, 74, 0.5);
    background: rgba(225, 30, 74, 0.02);
  }

  &.selected {
    border-color: var(--primary, #e11e4a);
    background: rgba(225, 30, 74, 0.05);
  }

  .config-name {
    font-weight: 500;
    color: var(--color-head);
  }

  .config-details {
    font-size: 13px;
    color: var(--color-body-secondary, #666);
    margin-top: 4px;
  }
}

.channel-selection {
  margin-top: 20px;

  h4 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-head);
  }
}

.channel-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.channel-option {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background 0.2s ease;
  color: var(--color-text);

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  input[type="radio"] {
    accent-color: var(--primary, #e11e4a);
  }
}

.modal-actions {
  @include popup-actions;

  .btn.secondary {
    @include popup-button-cancel;
  }

  .btn.primary {
    @include popup-button-primary;
  }
}
</style>
