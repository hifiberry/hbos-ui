<template>
  <div class="contentBox">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
.contentBox {
  background: var(--background-card);
  border-radius: 10px;
  color: var(--color-body);
  stroke: var(--color-body);

  &:not(:last-of-type) {
  margin-bottom: 55px;
    @include media-down(lg) {
      margin-bottom: 24px;
    }
  }
}
</style>
