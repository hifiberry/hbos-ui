<script setup lang="ts">
import { computed } from 'vue'
import type { Extension } from '@/api/extensions'

const props = withDefaults(
  defineProps<{ extension: Extension; busy?: boolean }>(),
  { busy: false },
)

const emit = defineEmits<{
  install: [pkg: string]
  uninstall: [pkg: string]
}>()

const actionLabel = computed(() => {
  switch (props.extension.state) {
    case 'installed':
      return 'Remove'
    case 'upgradable':
      return 'Update'
    default:
      return 'Install'
  }
})

const showRebootHint = computed(
  () => props.extension.needs_reboot !== 'no' && props.extension.state !== 'installed',
)

function onAction() {
  if (props.busy) return
  if (props.extension.state === 'installed') {
    emit('uninstall', props.extension.package)
  } else {
    emit('install', props.extension.package)
  }
}
</script>

<template>
  <div class="extension-card">
    <div class="extension-card__icon" data-test="icon" :data-category="extension.category">
      <img v-if="extension.icon_url" :src="extension.icon_url" :alt="extension.name" />
      <span v-else class="extension-card__icon-fallback">{{ extension.category }}</span>
    </div>

    <div class="extension-card__body">
      <h3 class="extension-card__name">{{ extension.name }}</h3>
      <p class="extension-card__summary">{{ extension.summary }}</p>

      <p class="extension-card__version" data-test="version">
        <template v-if="extension.state === 'installed'">
          Installed: {{ extension.installed_version }}
        </template>
        <template v-else-if="extension.state === 'upgradable'">
          {{ extension.installed_version }} &rarr; {{ extension.version }}
        </template>
        <template v-else>Version {{ extension.version }}</template>
      </p>

      <p v-if="showRebootHint" class="extension-card__reboot" data-test="reboot-hint">
        May require a reboot
      </p>
    </div>

    <div class="extension-card__actions">
      <button
        type="button"
        data-test="action"
        :disabled="busy"
        @click="onAction"
      >
        {{ actionLabel }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;

.extension-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.extension-card__body {
  flex: 1;
}

.extension-card__reboot {
  font-size: 0.85em;
  opacity: 0.8;
}
</style>
