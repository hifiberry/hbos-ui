<template>
  <div class="app-cover">
    <AppIcon
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
        width="450"
        height="450"
        loading="lazy"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref as deepRef, watch } from 'vue'
import { useImage } from '@vueuse/core'

import AppIcon from '@/components/app-icon.vue'

interface AppCoverProps {
  src?: string
  alt?: string
  delay?: number
}

const { src = '', alt = '', delay = 0 } = defineProps<AppCoverProps>()

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
  height: 450px;
  width: 450px;
  background-color: var(--cover-placeholder-bg);

  @include media-down(md) {
    height: 350px;
    width: 350px;
  }

  @include media-down(sm) {
    height: 250px;
    width: 250px;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

svg.app-cover__placeholder-icon {
  width: 26.67%;
  height: 26.67%;
  color: var(--cover-placeholder-icon-color);
}
</style>
