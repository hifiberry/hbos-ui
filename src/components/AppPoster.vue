<template>
  <div class="poster">
    <div :class="['poster-img', posterForm, { placeholder: error }]">
      <AppIcon
        v-if="error"
        class="poster-img__placeholder"
        :icon="posterForm === 'circle' ? 'users-thin' : 'notebook-thin'"
      />
      <img v-else :src="src" :alt="title" loading="lazy" />
    </div>
    <div class="poster-attr">
      <div class="h4">
        <AppMarquee>
          {{ title }}
        </AppMarquee>
      </div>
      <div class="h5">
        <AppMarquee>
          {{ subtitle }}
        </AppMarquee>
      </div>
      <div v-if="note" class="note">
        <AppMarquee>
          {{ note }}
        </AppMarquee>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref as deepRef, watch } from 'vue'
import { useImage } from '@vueuse/core'

import AppIcon from '@/components/app-icon.vue'
import AppMarquee from '@/components/AppMarquee.vue'

type PoserForm = 'square' | 'circle'

interface PosterProps {
  title: string
  subtitle: string
  note?: string
  src: string
  posterForm?: PoserForm
}

const {
  title = '',
  subtitle = '',
  note = '',
  src = '',
  posterForm = 'square',
} = defineProps<PosterProps>()

const imageOptions = deepRef({ src })
const { error } = useImage(imageOptions, { delay: 0 })

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
  font-size: 14px;
  white-space: nowrap;
  &:hover {
    color: $primary;
    .h4,
    .h5 {
      color: $primary;
    }
    .poster-img {
      img {
        transform: scale(1.2);
      }
    }
  }
  &-img {
    width: 140px;
    height: 140px;
    margin-bottom: 10px;
    overflow: hidden;
    @include media-down(lg) {
      width: 100px;
      height: 100px;
    }
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
        color: var(--color-icon-primary);
      }
    }
  }
  &-attr {
    width: 100%;
    text-align: center;
    font-size: 12px;
    .h4,
    .h5 {
      transition: all 0.2s linear;
      margin-bottom: 3px;
    }
    .h4 {
      @include poster-title;
    }
    .h5 {
      @include poster-subtitle;
    }
    .note {
      @include poster-note;
    }
  }
}
</style>
