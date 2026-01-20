<template>
  <ContentBox>
    <div class="filter-list-container">
      <template v-if="props.filterList.length === 0">
        <p>no filters in the current channel</p>
      </template>
      <div v-for="filter in props.filterList" class="filter-list-entry">
        <Icon :icon="getFilterIconName(filter.icon)" />
        <p>
          {{ filter.icon }}
        </p>
      </div>
    </div>
  </ContentBox>
</template>

<script setup lang="ts">
import { type Filter } from '@/utils/filtercalc';
import { getFilterIconName } from '@/utils/filter-display';
import ContentBox from '@/components/ContentBox.vue';
import Icon from '@/components/Icon.vue';

const props = defineProps<{
  filterList: Filter[];
}>();
</script>
<style>
.filter-list-container {
  padding: 10px;
}

.filter-list-entry {
  transition: all 0.25s;

  border: 2px solid var(--color-body);
  border-radius: 8px;
  padding: 10px;
  margin: 10px;

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;

  &:hover {
    border: 2px solid var(--primary);
    background: rgba(225, 30, 74, 0.1);
  }
}
</style>
