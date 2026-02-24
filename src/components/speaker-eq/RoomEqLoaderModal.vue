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
