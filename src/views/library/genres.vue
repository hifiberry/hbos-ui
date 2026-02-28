<template>
  <PageContent title="Genres" :backrouterLink="{ name: 'library' }">
    <div class="card">
      <div :class="['poster-grid', 'cell']">
        <template v-if="loading">
          <PosterSkeleton :posterForm="'square'" :is-note="false" />
        </template>

        <template v-else>
          <div
            v-for="category in categories"
            :key="category"
            class="poster-item"
            @click="router.push({ name: 'albums-by-genre', params: { category } })"
          >
            <div class="poster">
              <div class="poster-img square placeholder">
                <Icon class="poster-img__placeholder" icon="notebook-thin" />
              </div>
              <div class="poster-attr">
                <div class="h4">{{ category }}</div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div v-if="!loading && categories.length === 0" class="no-items">
        No genres found. Add genre mappings to create genres.
      </div>
    </div>
  </PageContent>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import PageContent from '@/components/PageContent.vue'
import PosterSkeleton from '@/components/skeletons/PosterSkeleton.vue'
import Icon from '@/components/Icon.vue'
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
.poster-grid {
  display: grid;
  gap: 30px;

  &.cell {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    @include media-down(md) {
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 24px 15px;
    }
  }
}

.poster-item {
  display: contents;
}

.poster {
  color: var(--color-body-secondary);
  cursor: pointer;
  transition: all 0.2s linear;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 14px;
  white-space: nowrap;

  &:hover {
    color: $primary;

    .h4 {
      color: $primary;
    }
  }

  &-img {
    width: 140px;
    height: 140px;
    margin-bottom: 10px;
    overflow: hidden;

    @include media-down(lg) {
      width: 100px;
      height: 100px;
    }

    &.placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--cover-placeholder-bg);

      svg {
        width: 50px;
        height: 50px;
        color: var(--color-icon-primary);
      }
    }
  }

  &-attr {
    width: 100%;
    text-align: center;
    font-size: 12px;

    .h4 {
      @include poster-title;
      text-transform: capitalize;
    }
  }
}

.no-items {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  color: var(--color-body-secondary);
  padding: 24px;
  text-align: center;
}
</style>
