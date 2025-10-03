<template>
  <router-link :to="to">
    <ContentBox class="contentBoxLink">
      <slot></slot>
    </ContentBox>
  </router-link>
</template>

<script setup lang="ts">
import ContentBox from "@/components/ContentBox.vue"

const { to } = defineProps<{ to: any }>()
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
