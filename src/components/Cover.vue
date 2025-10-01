<template>
  <div class="app-cover" :class="{ 'no-img': isLoading || error }">
    <Icon
      v-if="isLoading || error"
      class="app-cover__placeholder-icon"
      :icon="isLoading ? 'loading' : 'music'"
    />

    <Transition name="app-cover--fade" mode="out-in">
      <img
        :key="src"
        v-if="!(isLoading || error)"
        :src="imageOptions.src"
        :alt="alt"
        loading="lazy"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref as deepRef, watch } from 'vue'
import { useImage } from '@vueuse/core'

import Icon from '@/components/Icon.vue'

interface CoverProps {
  src?: string
  alt?: string
  delay?: number
}

const { src = '', alt = '', delay = 0 } = defineProps<CoverProps>()

const imageOptions = deepRef({ src })
const { isLoading, error } = useImage(imageOptions, { delay: delay })

watch(
  () => src,
  (src) => {
    imageOptions.value.src = src
  },
)
</script>

<style lang="scss">
.app-cover--fade-enter-active,
.app-cover--fade-leave-active {
  transition: opacity 0.5s ease;
}

.app-cover--fade-enter-from,
.app-cover--fade-leave-to {
  opacity: 0;
}

.app-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: unset;

  img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
    object-position: center center;
  }

  &.no-img {
    width: 100%;
    height: 100%;
    max-width: min(80vw, 40vh);
    max-height: min(80vw, 40vh);
    background-color: var(--cover-placeholder-bg);
  }
}

svg.app-cover__placeholder-icon {
  width: 26.67%;
  height: 26.67%;
  color: var(--cover-placeholder-icon-color);
}
</style>
