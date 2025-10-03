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

  margin-bottom: 25px;
}
</style>
