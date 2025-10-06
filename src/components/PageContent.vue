<template>
  <div>
    <BackRouter
      v-if="backrouterLink"
      :to="backrouterLink"
      class="backrouter"
      :class="{'noPadding': headerHasContentBelow}"
    >
      {{ title }}
    </BackRouter>

    <router-link
      v-else-if="hintLink"
      :to="hintLink"
      class="titleHintLink"
      :class="{'noPadding': headerHasContentBelow}"
    >
      <h1>
        {{ title }}
      </h1>
      <span class="minimalHint">
        {{ hintString }}
      </span>
    </router-link>

    <h1
      v-else
      :class="{'noPadding': headerHasContentBelow}"
    >
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
    hintLink: String,
    hintString: String,
    headerHasContentBelow: Boolean,
  }>()
</script>

<style scoped lang="scss">
h1, .backrouter {
  padding-bottom: 25px;
  @include media-down(sm) {
    display: none;
  }
  &.noPadding{
    padding-bottom: 0px;
  }
}

.titleHintLink {
  color: var(--color-text);
  text-decoration: none;
  position: relative;
  display: inline-block;
  transition: color 0.3s ease;

  &:hover {
    color: var(--color-accent);
    cursor: pointer;

    .minimalHint {
      opacity: 1;
      visibility: visible;
    }
  }
}

.minimalHint {
  position: absolute;
  top: 50%;
  color: var(--color-body);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 400;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  margin-top: 8px;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

  /* Create a CSS triangle */
  &::before {
    content: "";
    position: absolute;
    top: -4px;
    left: 50%;
    border: 4px solid transparent;
    border-bottom-color: var(--color-body);
  }
}
</style>
