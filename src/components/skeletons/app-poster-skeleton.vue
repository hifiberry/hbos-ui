<template>
  <div class="poster-skeleton" v-for="(_, index) in 8" :key="`skeleton-item-${index}`">
    <div class="poster-skeleton__img">
      <AppSkeleton :shape="posterForm === 'circle' ? 'circle' : 'square'" />
    </div>
    <AppSkeleton width="100%" height="12px" class="poster-skeleton__row" />
    <AppSkeleton width="100%" height="12px" class="poster-skeleton__row" />
    <AppSkeleton v-if="isNote" width="100%" height="10px" />
  </div>
</template>

<script setup lang="ts">
import AppSkeleton from '@/components/skeletons/app-skeleton.vue'

type posterForm = 'square' | 'circle'
interface PosterProps {
  posterForm?: posterForm
  isNote?: boolean
}
const { posterForm = 'square', isNote = false } = defineProps<PosterProps>()
</script>

<style scoped lang="scss">
.poster-skeleton {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  &__img {
    margin-bottom: 10px;
    .skeleton {
      width: 140px;
      height: 140px;
      @include media-down(lg) {
        width: 100px;
        height: 100px;
      }
    }
  }
  &__row {
    margin-bottom: 8px;
  }
}
</style>
