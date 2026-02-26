<template>
  <label class="toggle-switch" :class="{ disabled }">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    >
    <span class="toggle-slider" :class="{ loading }"></span>
  </label>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
  disabled?: boolean
  loading?: boolean
}>();

defineEmits<{
  'update:modelValue': [value: boolean]
}>();
</script>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;

.toggle-switch {
  @include toggle-switch;
}
</style>
