<template>
  <div class="status-block" :class="`status-block--${variant}`" :role="role">
    <Icon :icon="icon" class="status-block__icon" />
    <div class="status-block__text"><slot></slot></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'

type StatusVariant = 'error' | 'warning' | 'success'

interface StatusBlockProps {
  variant?: StatusVariant
}

const { variant = 'error' } = defineProps<StatusBlockProps>()

// Icon names are checked against public/images/svg: Icon.vue resolves
// `tabler/alert-circle` to /images/svg/tabler/alert-circle.svg, and a name
// that does not exist renders nothing while logging a 404.
const icons: Record<StatusVariant, string> = {
  error: 'tabler/alert-circle',
  warning: 'tabler/alert-triangle',
  success: 'tabler/circle-check',
}

const icon = computed(() => icons[variant])

// A failure has to interrupt; a success only has to be noticed.
const role = computed(() => (variant === 'success' ? 'status' : 'alert'))
</script>

<style scoped lang="scss">
// The state lives on the surface and the icon, never on the text. The brand
// colour is itself a red and sits on every action button, so a second red
// label cannot be told apart from a button; the tint plus the icon carry the
// meaning instead. --color-head is the only text colour that clears 4.5:1 on
// these tints - --color-body reaches just 4.34:1 on the error tint.
.status-block {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 8px;
  border: 1px solid;
  text-align: left;

  &--error {
    background: var(--background-error);
    border-color: var(--color-error);

    .status-block__icon {
      color: var(--color-error);
    }
  }

  &--warning {
    background: var(--background-warning);
    border-color: var(--color-warning);

    .status-block__icon {
      color: var(--color-warning);
    }
  }

  &--success {
    background: var(--background-success);
    border-color: var(--color-success);

    .status-block__icon {
      color: var(--color-success);
    }
  }
}

.status-block__icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-top: 2px;
}

.status-block__text {
  color: var(--color-head);
  line-height: 1.5;
  min-width: 0;
}
</style>
