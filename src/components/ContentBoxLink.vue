<template>
  <router-link :to="to">
    <ContentBox class="contentBoxLink" :style="{ height: height + 'px' }">
      <slot></slot>
    </ContentBox>
  </router-link>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import ContentBox from "@/components/ContentBox.vue";

const { to, height } = defineProps<{ to: RouteLocationRaw, height?: number }>()
</script>

<style scoped lang="scss">
.contentBox {
  padding: 20px;
  transition: all 0.2s ease;
  &:hover{
    transform: translateY(-2px);
  }
}
</style>
