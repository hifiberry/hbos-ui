<template>
  <div class="poster-skeleton" v-for="(_, index) in 8" :key="`skeleton-item-${index}`">
    <div class="poster-skeleton__img">
      <AppSkeleton
        width="140px"
        height="140px"
        :border-radius="posterForm === 'circle' ? '50%' : ''"
      />
    </div>
    <div class="poster-skeleton__title">
      <AppSkeleton width="100%" height="16px" />
    </div>
    <AppSkeleton width="100%" height="16px" />
  </div>
</template>

<script setup lang="ts">
import AppSkeleton from '@/components/app-skeleton.vue'

type posterForm = 'square' | 'circle'
interface PosterProps {
  posterForm?: posterForm
}
const { posterForm = 'square' } = defineProps<PosterProps>()
</script>

<style scoped lang="scss">
.poster-skeleton {
  &__img {
    margin-bottom: 10px;
  }
  &__title {
    margin-bottom: 8px;
  }
}
</style>
