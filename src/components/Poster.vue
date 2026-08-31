<template>
  <div class="poster">
    <div :class="['poster-img', posterForm, { placeholder: showPlaceholder }]">
      <Icon
        v-if="showPlaceholder"
        class="poster-img__placeholder"
        :icon="posterForm === 'circle' ? 'users-thin' : 'notebook-thin'"
      />
      <img v-else :src="src" :alt="title" loading="lazy" @error="error = true" />
    </div>
    <div class="poster-attr">
      <div class="h4">
        <CustomMarquee>
          {{ title }}
        </CustomMarquee>
      </div>
      <div class="h5">
        <CustomMarquee>
          {{ subtitle }}
        </CustomMarquee>
      </div>
      <div v-if="note" class="note">
        <CustomMarquee>
          {{ note }}
        </CustomMarquee>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import Icon from '@/components/Icon.vue'
import CustomMarquee from '@/components/CustomMarquee.vue'

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

// The <img> does the fetching, so the browser can honour loading="lazy" and
// skip the covers that are still below the fold. Preloading through an
// Image() - which is what useImage() does - starts every request in the grid
// the moment the component mounts, whatever the attribute says.
const error = ref(false)

// An <img src=""> re-requests the current page instead of failing, so an item
// with no cover never reaches @error. It has to be caught before rendering.
const showPlaceholder = computed(() => !src || error.value)

watch(
  () => src,
  () => {
    error.value = false
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
