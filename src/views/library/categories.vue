<template>
  <PageContent title="Categories" :backrouterLink="{ name: 'library' }">
    <div v-if="loading" class="category-grid">
      <div v-for="n in 16" :key="n" class="category-card skeleton" />
    </div>

    <div v-else-if="categories.length === 0" class="empty-state">
      <p>No categories found. Add genre mappings to create categories.</p>
    </div>

    <div v-else class="category-grid">
      <div
        v-for="category in categories"
        :key="category"
        class="category-card"
        @click="router.push({ name: 'albums-by-category', params: { category } })"
      >
        <span class="category-name">{{ category }}</span>
      </div>
    </div>
  </PageContent>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import PageContent from '@/components/PageContent.vue'
import { useLibraryFetch } from '@/composables/useLibraryFetch.ts'
import { useToastStore } from '@/stores/toast'
import { useLibraryStore } from '@/stores/library.ts'

const router = useRouter()
const libraryFetch = useLibraryFetch()
const toastStore = useToastStore()
const libraryStore = useLibraryStore()

const categories = ref<string[]>([])
const loading = ref(false)

const loadCategories = async () => {
  loading.value = true
  await libraryStore.getAvailableLibrary()

  const { error, data } = await libraryFetch<{ categories: string[] }>(
    '/library/:activeLibrary/categories',
  ).json()

  if (error.value) {
    toastStore.showErrorToast(`Failed to load categories: ${error.value}`)
  } else if (data.value?.categories) {
    categories.value = data.value.categories
  }

  loading.value = false
}

onMounted(loadCategories)
</script>

<style scoped lang="scss">
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
  padding: 24px;

  @include media-down(md) {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
    padding: 16px;
  }
}

.category-card {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  padding: 16px 12px;
  border-radius: 12px;
  background-color: var(--color-background-secondary);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
  text-align: center;

  &:hover {
    background-color: var(--color-accent);
    border-color: var(--color-accent);
    transform: translateY(-2px);

    .category-name {
      color: white;
    }
  }

  &.skeleton {
    animation: pulse 1.5s ease-in-out infinite;
    cursor: default;

    &:hover {
      background-color: var(--color-background-secondary);
      border-color: var(--color-border);
      transform: none;
    }
  }
}

.category-name {
  color: var(--color-head);
  font-size: 15px;
  font-weight: 600;
  text-transform: capitalize;
  line-height: 1.3;
}

.empty-state {
  padding: 40px 24px;
  text-align: center;
  color: var(--color-text-secondary);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
