<template>
  <div class="app-search">
    <input :type="type" :value="modelValue" :placeholder="placeholder" @input="onInput" />
    <button class="search-btn">
      <AppIcon icon="magnifying-glass-light" />
    </button>
    <button v-if="modelValue.length" class="clear-btn" @click="onClear">
      <AppIcon icon="clear" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'

import AppIcon from '@/components/app-icon.vue'

interface InputProps {
  modelValue: string
  type?: string
  required?: boolean
  debounce?: number
  placeholder?: string
}

const props = withDefaults(defineProps<InputProps>(), {
  modelValue: '',
  type: 'text',
  required: false,
  debounce: 0,
  placeholder: 'Search',
})

const emit = defineEmits(['update:modelValue', 'change'])

const debouncedFn = useDebounceFn((value: string) => {
  emit('update:modelValue', value)
  emit('change', value)
}, props.debounce)

const onInput = ($event: Event) => {
  const target = $event.target as HTMLInputElement

  const value = target.value.trim()

  if (props.debounce) {
    debouncedFn(value)
  } else {
    emit('update:modelValue', value)
    emit('change', value)
  }
}

const onClear = () => {
  emit('update:modelValue', '')
  emit('change', '')
}
</script>

<style scoped lang="scss">
.app-search {
  position: relative;
  &:focus-within {
    input {
      @include media-down(md) {
        width: calc(100vw - 70px);
        height: 32px;
        padding: 0 40px 0 20px;
        opacity: 1;
        transform: translateX(0);
      }
    }
  }
  &:not(:focus-within) {
    .clear-btn {
      display: none;
    }
  }
  input {
    height: 32px;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 500;
    padding: 0 40px;
    width: 100%;
    background-color: var(--search-background);
    box-shadow: $box-shadow-main-content;
    color: var(--search-color);
    &::placeholder {
      color: $search-color-placeholder;
    }
    @include media-down(md) {
      height: 0;
      opacity: 0;
      overflow: hidden;
      transition:
        max-height 0.3s ease,
        opacity 0.3s ease,
        transform 0.3s ease;
      transform: translateX(10px);
      width: 0;
      padding: 0;
      position: absolute;
      top: -5px;
      right: 40px;
    }
  }
  .search-btn,
  .clear-btn {
    width: 30px;
    height: 100%;
    position: absolute;
    top: 0;
    padding: 0;
    outline: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .search-btn {
    left: 5px;
    @include media-down(md) {
      position: static;
    }
  }
  .clear-btn {
    right: 0;
    @include media-down(md) {
      right: 45px;
      top: -2px;
    }
  }
}
</style>
