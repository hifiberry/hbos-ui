<template>
  <div class="poster">
    <div :class="['poster-img', posterForm, { placeholder: error }]">
      <AppIcon v-if="error" class="poster-img__placeholder" icon="music" />
      <img v-else :src="src" :alt="title" loading="lazy" />
    </div>
    <h4>{{ title }}</h4>
    <p>{{ subtitle }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref as deepRef, watch } from 'vue'
import { useImage } from '@vueuse/core'

import AppIcon from '@/components/app-icon.vue'

type PoserForm = 'square' | 'circle'

interface PosterProps {
  title: string
  subtitle: string
  src: string
  posterForm?: PoserForm
}

const { title = '', subtitle = '', src = '', posterForm = 'square' } = defineProps<PosterProps>()

const imageOptions = deepRef({ src })
const { error } = useImage(imageOptions, { delay: 400 })

watch(
  () => src,
  (src) => {
    imageOptions.value.src = src
  },
)
</script>

<style scoped lang="scss">
.poster {
  color: var(--color-body-secondary);
  cursor: pointer;
  transition: all 0.2s linear;
  display: flex;
  flex-direction: column;
  align-items: center;
  &-img {
    width: 140px;
    height: 140px;
    margin-bottom: 10px;
    overflow: hidden;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: all 0.2s linear;
    }
    &.circle {
      border-radius: 50%;
    }
    &.placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--cover-placeholder-bg);
      svg {
        width: 50px;
        height: 50px;
      }
    }
  }
  h4 {
    transition: all 0.2s linear;
  }
  &:hover {
    color: $primary;
    h4 {
      color: $primary;
    }
    .poster-img {
      img {
        transform: scale(1.2);
      }
    }
  }
}
</style>
