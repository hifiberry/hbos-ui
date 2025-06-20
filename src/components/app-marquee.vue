<template>
  <div class="marquee">
    <div
      class="marquee-container"
      ref="marqueeContainer"
      @mouseenter="onHover"
      @mouseleave="onLeave"
    >
      <div :class="['marquee-text', { animate: shouldAnimate }]" ref="marqueeText">
        <span>
          <slot />
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const marqueeContainer = ref<HTMLElement | null>(null)
const marqueeText = ref<HTMLElement | null>(null)
const shouldAnimate = ref(false)

const onHover = () => {
  if (marqueeContainer.value && marqueeText.value) {
    shouldAnimate.value = marqueeText.value.scrollWidth > marqueeContainer.value.offsetWidth
  }
}

const onLeave = () => {
  shouldAnimate.value = false
}
</script>

<style scoped lang="scss">
@keyframes scroll-text {
  0% {
    transform: translateX(0%);
  }
  100% {
    transform: translateX(-100%);
  }
}

.marquee {
  overflow: hidden;
  margin-inline-start: -6px;
  &-container {
    width: 100%;
    mask-image: linear-gradient(
      90deg,
      transparent 0,
      var(--background-header) 6px,
      var(--background-header) calc(100% - 6px),
      transparent
    );
    white-space: nowrap;
    span {
      padding-inline: 5px;
    }
  }
  &-text {
    display: inline-block;
    transform: translateX(0);
    transition: none;
    &.animate {
      animation: scroll-text 8s linear infinite;
    }
  }
}
</style>
