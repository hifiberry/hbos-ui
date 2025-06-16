<template>
  <div class="app-input">
    <div class="input-group">
      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        @input="onInput"
      />
    </div>
  </div>
</template>

<script setup lang="ts">

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  type: { type: String, default: 'text' },
  required: { type: Boolean, default: false },
  debounce: { type: Number, default: 0 },
  placeholder: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const onInput = ($event: Event) => {
  const target = $event.target as HTMLInputElement

  if (props.debounce) {
    setTimeout(() => {
      emit('update:modelValue', target.value)
    }, props.debounce)
  } else {
    emit('update:modelValue', target.value)
  }
}
</script>

<style scoped lang="scss">
.app-input {
  .input-group {
    input {
      height: 48px;
      border: 2px solid #dedede;
      border-radius: 6px;
      font-size: 18px;
      padding: 0 16px;
      width: 100%;
    }
  }
}
</style>
