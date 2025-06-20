<template>
  <div class="poster-skeleton" v-for="(_, index) in 8" :key="`skeleton-item-${index}`">
    <div class="poster-skeleton__img">
      <!--      width="140px"-->
      <!--      height="140px"-->
      <AppSkeleton :border-radius="posterForm === 'circle' ? '50%' : ''" />
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
  &__title {
    margin-bottom: 8px;
    width: 100%;
  }
}
</style>
