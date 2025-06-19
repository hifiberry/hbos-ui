<template>
  <div class="skeleton-sandbox">
    <div class="skeleton-sandbox__item">
      <h2>Poster Skeletons</h2>
      <div class="skeleton-sandbox__item-cell">
        <div class="card">
          <AppPosterSkeleton />
        </div>
      </div>
      <div class="skeleton-sandbox__item-cell">
        <div class="card">
          <AppPosterSkeleton poster-form="circle" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppPosterSkeleton from '@/components/skeletons/app-poster-skeleton.vue'
</script>

<style scoped lang="scss">
.skeleton-sandbox {
  .card {
    display: flex;
    gap: 20px;
  }
  &__item {
    padding: 12px;
    border: 1px solid lightblue;
    &-cell {
      &:not(:last-child) {
        margin-bottom: 40px;
      }
    }
  }
}
</style>
