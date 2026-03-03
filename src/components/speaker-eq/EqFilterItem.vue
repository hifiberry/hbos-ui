<template>
  <div class="filter-item" :class="{ active: isActive }" @click="$emit('select', filter.id)">
    <div class="filter-main">
      <div class="filter-info">
        <Icon :icon="getFilterIconName(filter.icon)" class="filter-icon"
          :class="filter.icon === 'peaking' ? 'icon-stroke' : ''" />
        <div class="filter-details">
          <h3 v-if="filter.icon === 'generic_normalized'">
            {{ formatFilterTypeName(filter.icon) }} |
            b0={{ filter.genericCoeffs?.b0 || 1 }}
            b1={{ filter.genericCoeffs?.b1 || 0 }}
            b2={{ filter.genericCoeffs?.b2 || 0 }}
            a1={{ filter.genericCoeffs?.a1 || 0 }}
            a2={{ filter.genericCoeffs?.a2 || 0 }}
          </h3>
          <h3 v-else>
            {{ formatFilterTypeName(filter.icon) }} | {{ filter.frequency }} Hz | {{ filter.gain }} dB | Q {{ filter.Q ? filter.Q.toFixed(2) : 'N/A' }}
          </h3>
        </div>
      </div>
      <div class="filter-actions" @click.stop>
        <div class="filter-remove" @click="$emit('remove', filter.id)">
          <Icon icon="close" />
        </div>
      </div>
    </div>

    <div class="filter-controls" @click.stop>
      <template v-if="filter.icon !== 'generic_normalized'">
        <div class="standard-controls">
          <div class="control-group" v-for="ctrl in standardControls" :key="ctrl.label">
            <label>{{ ctrl.label }}</label>
            <div class="control-buttons">
              <button @click="$emit(ctrl.decEvent, filter)" class="control-btn">
                <Icon icon="minus-small" />
              </button>
              <span class="control-value">{{ ctrl.format(filter) }}</span>
              <button @click="$emit(ctrl.incEvent, filter)" class="control-btn">
                <Icon icon="plus-small" />
              </button>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="coefficient-inputs">
          <div v-for="coeff in (['b0', 'b1', 'b2', 'a1', 'a2'] as const)" :key="coeff" class="coefficient-group">
            <label>{{ coeff }}</label>
            <input type="number" step="0.001"
                   :value="filter.genericCoeffs?.[coeff] ?? (coeff === 'b0' ? 1 : 0)"
                   @input="$emit('update-generic-coeff', filter, coeff, $event)"
                   :placeholder="coeff === 'b0' ? '1.000' : '0.000'" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon.vue';
import { type Filter } from '@/utils/filtercalc';
import { getFilterIconName, formatFilterTypeName } from '@/utils/filter-display';

defineProps<{
  filter: Filter
  isActive: boolean
}>();

defineEmits<{
  select: [id: number]
  remove: [id: number]
  'increment-frequency': [filter: Filter]
  'decrement-frequency': [filter: Filter]
  'increment-gain': [filter: Filter]
  'decrement-gain': [filter: Filter]
  'widen-band': [filter: Filter]
  'narrow-band': [filter: Filter]
  'update-generic-coeff': [filter: Filter, coeffName: string, event: Event]
}>();

const standardControls = [
  {
    label: 'Frequency',
    decEvent: 'decrement-frequency' as const,
    incEvent: 'increment-frequency' as const,
    format: (f: Filter) => `${f.frequency} Hz`,
  },
  {
    label: 'Gain',
    decEvent: 'decrement-gain' as const,
    incEvent: 'increment-gain' as const,
    format: (f: Filter) => `${f.gain} dB`,
  },
  {
    label: 'Q (width)',
    decEvent: 'widen-band' as const,
    incEvent: 'narrow-band' as const,
    format: (f: Filter) => f.Q ? f.Q.toFixed(2) : 'N/A',
  },
];
</script>

<style scoped lang="scss">
@use '@/assets/scss/mixins' as *;

.filter-item {
  padding: 20px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(112, 112, 112, 0.3);
  transition: all 0.2s ease-in-out;
  cursor: pointer;

  &.active {
    border-color: var(--primary, #e11e4a);
    background: rgba(225, 30, 74, 0.05);
  }

  &:hover {
    border-color: rgba(225, 30, 74, 0.5);
    background: rgba(225, 30, 74, 0.02);
  }
}

.filter-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.filter-info {
  display: flex;
  align-items: center;
  gap: 15px;

  .filter-icon {
    width: 32px;
    height: 32px;
  }

  h3 {
    font-size: 18px;
    font-weight: 500;
    margin: 0;
  }
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 15px;

  .filter-remove {
    @include delete-button-small;
  }
}

// Standard parameter controls
.standard-controls {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.control-group {
  display: flex;
  flex-direction: column;
  align-items: center;

  label {
    font-size: 12px;
    color: #666;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.control-buttons {
  display: flex;
  align-items: center;
  gap: 10px;

  .control-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(112, 112, 112, 0.5);
    border-radius: 4px;
    padding: 8px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(225, 30, 74, 0.2);
      border-color: var(--primary, #e11e4a);
    }

    svg {
      width: 14px;
      height: 14px;
      fill: white;
    }
  }

  .control-value {
    font-size: 14px;
    font-weight: 500;
    min-width: 60px;
    text-align: center;
    color: var(--color-text);
  }
}

// Generic biquad coefficient inputs
.coefficient-inputs {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.coefficient-group {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;

  label {
    font-size: 12px;
    color: #666;
    font-weight: 600;
    text-transform: uppercase;
    text-align: center;
  }

  input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid rgba(112, 112, 112, 0.5);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.95);
    color: #333;
    font-size: 13px;
    font-weight: 500;
    text-align: center;
    font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
    transition: all 0.2s ease;

    &:focus {
      outline: none;
      border-color: var(--primary, #e11e4a);
      box-shadow: 0 0 0 2px rgba(225, 30, 74, 0.1);
    }

    &:hover {
      border-color: rgba(225, 30, 74, 0.7);
    }
  }
}
</style>
