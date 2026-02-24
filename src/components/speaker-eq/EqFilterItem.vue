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
        <div class="filter-toggle">
          <label class="toggle-switch">
            <input type="checkbox" :checked="filter.enabled" @change="$emit('toggle-enabled', filter)" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="filter-remove" @click="$emit('remove', filter.id)">
          <Icon icon="close" />
        </div>
      </div>
    </div>

    <div class="filter-controls" @click.stop>
      <!-- Standard filter controls for non-generic filters -->
      <template v-if="filter.icon !== 'generic_normalized'">
        <div class="standard-controls">
          <div class="control-group">
            <label>Frequency</label>
            <div class="control-buttons">
              <button @click="$emit('decrement-frequency', filter)" class="control-btn">
                <Icon icon="minus-small" />
              </button>
              <span class="control-value">{{ filter.frequency }} Hz</span>
              <button @click="$emit('increment-frequency', filter)" class="control-btn">
                <Icon icon="plus-small" />
              </button>
            </div>
          </div>

          <div class="control-group">
            <label>Gain</label>
            <div class="control-buttons">
              <button @click="$emit('decrement-gain', filter)" class="control-btn">
                <Icon icon="minus-small" />
              </button>
              <span class="control-value">{{ filter.gain }} dB</span>
              <button @click="$emit('increment-gain', filter)" class="control-btn">
                <Icon icon="plus-small" />
              </button>
            </div>
          </div>

          <div class="control-group">
            <label>Q (width)</label>
            <div class="control-buttons">
              <button @click="$emit('widen-band', filter)" class="control-btn">
                <Icon icon="minus-small" />
              </button>
              <span class="control-value">{{ filter.Q ? filter.Q.toFixed(2) : 'N/A' }}</span>
              <button @click="$emit('narrow-band', filter)" class="control-btn">
                <Icon icon="plus-small" />
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Generic biquad coefficient controls -->
      <template v-else>
        <div class="generic-coefficients">
          <div class="coefficient-inputs">
            <div v-for="coeff in (['b0', 'b1', 'b2', 'a1', 'a2'] as const)" :key="coeff" class="coefficient-group">
              <label>{{ coeff }}</label>
              <input type="number" step="0.001"
                     :value="filter.genericCoeffs?.[coeff] ?? (coeff === 'b0' ? 1 : 0)"
                     @input="$emit('update-generic-coeff', filter, coeff, $event)"
                     :placeholder="coeff === 'b0' ? '1.000' : '0.000'" />
            </div>
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
  'toggle-enabled': [filter: Filter]
  'increment-frequency': [filter: Filter]
  'decrement-frequency': [filter: Filter]
  'increment-gain': [filter: Filter]
  'decrement-gain': [filter: Filter]
  'widen-band': [filter: Filter]
  'narrow-band': [filter: Filter]
  'update-generic-coeff': [filter: Filter, coeffName: string, event: Event]
}>();
</script>
