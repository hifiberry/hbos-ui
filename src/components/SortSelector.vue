<template>
  <div class="app-sort-selector">
    <span class="sort-label">Sort by:</span>

    <div class="sort-buttons">
      <button
        @click="handleSortByChange('release_date')"
        :class="['sort-btn', { active: sortBy === 'release_date' }]"
      >
        Year
        <Icon
          v-if="sortBy === 'release_date'"
          :icon="sortOrder === 'asc' ? 'caret-up' : 'caret-down'"
          class="sort-icon"
          :width="12"
          :height="12"
        />
      </button>

      <button
        @click="handleSortByChange('artist')"
        :class="['sort-btn', { active: sortBy === 'artist' }]"
      >
        Artist
      </button>

      <button
        @click="handleSortByChange('random')"
        :class="['sort-btn', { active: sortBy === 'random' }]"
        title="Shuffle"
      >
        <Icon icon="shuffle" :width="14" :height="14" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon.vue'

interface SortSelectorProps {
  sortBy: 'release_date' | 'artist' | 'random'
  sortOrder: 'asc' | 'desc'
}

const props = defineProps<SortSelectorProps>()

const emit = defineEmits<{
  sortByChange: [value: 'release_date' | 'artist' | 'random']
  toggleOrder: []
}>()

const handleSortByChange = (newSortBy: 'release_date' | 'artist' | 'random') => {
  if (newSortBy === 'release_date') {
    emit('sortByChange', newSortBy)
    if (props.sortBy === 'release_date') {
      emit('toggleOrder')
    }
  } else {
    // artist and random: just emit (random always reshuffles in the store)
    emit('sortByChange', newSortBy)
  }
}
</script>

<style scoped lang="scss">
.app-sort-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;

  .sort-label {
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .sort-buttons {
    display: flex;
    gap: 4px;
  }

  .sort-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-background);
    color: var(--color-text);
    font-size: 14px;
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

    &.active {
      background: var(--color-primary);
      color: var(--color-primary-text);
      border-color: var(--color-primary);
    }

    .sort-icon {
      font-size: 12px;
    }
  }
}
</style>
