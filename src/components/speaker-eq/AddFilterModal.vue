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
