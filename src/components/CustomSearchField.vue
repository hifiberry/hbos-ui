<template>
  <ContentBox>
    <div class="customSearchFieldContent">
      <input :type="type" :value="modelValue" :placeholder="placeholder" @input="onInput" />
      <button class="search-btn">
        <Icon icon="magnifying-glass-light" />
      </button>
      <button v-if="modelValue.length" class="clear-btn" @click="onClear">
        <Icon icon="clear" />
      </button>
    </div>
  </ContentBox>
</template>

<script setup lang="ts">
import ContentBox from "@/components/ContentBox.vue"
import { useDebounceFn } from '@vueuse/core'

import Icon from '@/components/Icon.vue'

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
.customSearchFieldContent{
  padding: 5px;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;

  input{
    width: 100%;
    color: var(--body-color);
  }
}
</style>
