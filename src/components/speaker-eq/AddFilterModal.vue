<template>
  <teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal-content">
        <h2>Add New Filter</h2>
        <p>Select filter type</p>

        <div class="filter-type-selector">
          <button v-for="type in filterTypes" :key="type"
            :class="['filter-type-option']"
            @click="$emit('add', type)">
            <Icon :icon="getFilterIconName(type)" class="filter-icon" />
            <span class="filter-name">{{ formatFilterTypeName(type) }}</span>
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon.vue';
import { type BiquadFilterType } from '@/utils/biquad';
import { getFilterIconName, formatFilterTypeName } from '@/utils/filter-display';

defineProps<{
  open: boolean
  filterTypes: BiquadFilterType[]
}>();

defineEmits<{
  close: []
  add: [type: BiquadFilterType]
}>();
</script>

<style scoped lang="scss">
@use '@/assets/scss/popup' as *;

.modal-backdrop {
  @include popup-overlay;
}

.modal-content {
  @include popup-container(480px);
  padding: 30px;
  text-align: center;

  h2 {
    margin: 0 0 8px;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-head);
  }

  p {
    color: var(--color-body-secondary, #666);
    margin: 0 0 24px;
  }
}

.filter-type-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.filter-type-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 16px;
  border: 1px solid rgba(112, 112, 112, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--color-text);

  &:hover {
    border-color: var(--primary, #e11e4a);
    background: rgba(225, 30, 74, 0.05);
  }

  .filter-icon {
    width: 32px;
    height: 32px;
  }

  .filter-name {
    font-size: 14px;
    font-weight: 500;
  }
}
</style>
