<template>
  <ContentBox>
    <div class="filter-list-container">
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
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}
</style>
