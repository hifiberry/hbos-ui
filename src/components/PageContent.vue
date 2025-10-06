<template>
  <div>
    <h1>
      {{ title }}
    </h1>
    <div class="content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
  defineProps<{
    title: String,
  }>()
</script>

<style scoped lang="scss">
h1{
  padding-bottom: 25px;
}
</style>
