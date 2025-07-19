<template>
  <div class="app-sort-selector">
    <label for="sort-select">Sort by:</label>
    <select
      id="sort-select"
      :value="sortBy"
      @change="handleSortByChange"
      class="sort-select"
    >
      <option value="release_date">Release Date</option>
      <option value="artist">Artist</option>
      <option value="name">Album Name</option>
    </select>

    <button
      @click="toggleOrder"
      class="sort-order-btn"
      :title="`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`"
    >
      <AppIcon :name="sortOrder === 'asc' ? 'chevron-thin-up' : 'caret-down'" />
    </button>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/app-icon.vue'

interface SortSelectorProps {
  sortBy: 'release_date' | 'artist' | 'name'
  sortOrder: 'asc' | 'desc'
}

defineProps<SortSelectorProps>()

const emit = defineEmits<{
  sortByChange: [value: 'release_date' | 'artist' | 'name']
  toggleOrder: []
}>()

const handleSortByChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('sortByChange', target.value as 'release_date' | 'artist' | 'name')
}

const toggleOrder = () => {
  emit('toggleOrder')
}
</script>

<style scoped lang="scss">
.app-sort-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;

  label {
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .sort-select {
    padding: 6px 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-background);
    color: var(--color-text);
    font-size: 14px;
    cursor: pointer;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  .sort-order-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-background);
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--color-background-hover);
      border-color: var(--color-primary);
    }

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }
}
</style>
