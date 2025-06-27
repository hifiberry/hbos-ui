<template>
  <div class="app-search">
    <div class="input-group">
      <input :type="type" :value="modelValue" :placeholder="placeholder" @input="onInput" />
      <button class="search-btn">
        <AppIcon icon="magnifying-glass-light" />
      </button>
      <button v-if="modelValue.length" class="clear-btn" @click="onClear">
        <AppIcon icon="clear" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'

import AppIcon from '@/components/app-icon.vue'

type Type = 'text' | 'number'
interface InputProps {
  modelValue: string
  type?: Type
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
  .input-group {
    position: relative;
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
  }
  .clear-btn {
    right: 0;
  }
}
</style>
