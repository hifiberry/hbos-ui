<template>
  <div>
    <BackRouter v-if="backrouterLink" :to="backrouterLink" class="backrouter">
      {{ title }}
    </BackRouter>
    <h1 v-else="backrouterLink">
      {{ title }}
    </h1>
    <div class="content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import BackRouter from '@/components/BackRouter.vue'
  defineProps<{
    title: String,
    backrouterLink: String,
  }>()
</script>

<style scoped lang="scss">
h1, .backrouter{
  padding-bottom: 25px;
}
</style>
